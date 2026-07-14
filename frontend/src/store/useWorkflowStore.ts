
import { create } from "zustand";
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";

// Interfaces
export interface TriggerNodeData {
  triggerType: "webhook" | "schedule";
  config: string;
  name: string;
}

export interface AgentNodeData {
  model: string;
  systemPrompt: string;
  temperature: number;
  name: string;
}

export interface ToolNodeData {
  toolType: "web-search" | "vector-db" | "slack-notify" | "postgres-query";
  parameters: Record<string, string>;
  name: string;
}

export type NodeData = TriggerNodeData | AgentNodeData | ToolNodeData;

export interface ExecutionTrace {
  nodeId: string;
  nodeType: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  durationMs?: number;
  tokensUsed?: number;
  cost?: number;
  outputData?: any;
  message?: string;
}

// Helper function to detect cycles
const hasCycle = (nodes: Node[], edges: Edge[]): boolean => {
  const adjacencyList: Record<string, string[]> = {};
  nodes.forEach((node) => (adjacencyList[node.id] = []));
  edges.forEach((edge) => adjacencyList[edge.source].push(edge.target));

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    for (const neighbor of adjacencyList[nodeId]) {
      if (dfs(neighbor)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  };

  for (const nodeId of Object.keys(adjacencyList)) {
    if (dfs(nodeId)) return true;
  }

  return false;
};

// Store
interface WorkflowStore {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  executionLogs: string[];
  executionTraces: ExecutionTrace[];
  totalTokens: number;
  totalCost: number;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: "trigger" | "agent" | "tool", position?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  resetCanvas: () => void;
  addExecutionLog: (log: string) => void;
  addExecutionTrace: (trace: ExecutionTrace) => void;
  setTotalTokens: (tokens: number) => void;
  setTotalCost: (cost: number) => void;
  serializeWorkflow: () => { success: boolean; data?: any; error?: string };
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  executionLogs: [],
  executionTraces: [],
  totalTokens: 0,
  totalCost: 0.0,

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  onConnect: (connection: Connection) =>
    set((state) => ({
      edges: addEdge(connection, state.edges),
    })),

  addNode: (type, position = { x: 250, y: 250 }) => {
    const id = uuidv4();
    let data: NodeData;
    let nodeType: string;

    switch (type) {
      case "trigger":
        data = {
          triggerType: "webhook",
          config: "",
          name: "New Trigger",
        } as TriggerNodeData;
        nodeType = "trigger";
        break;
      case "agent":
        data = {
          model: "gpt-4o",
          systemPrompt: "You are a helpful assistant.",
          temperature: 0.7,
          name: "New Agent",
        } as AgentNodeData;
        nodeType = "agent";
        break;
      case "tool":
        data = {
          toolType: "web-search",
          parameters: {},
          name: "New Tool",
        } as ToolNodeData;
        nodeType = "tool";
        break;
    }

    const newNode: Node<NodeData> = {
      id,
      type: nodeType,
      position,
      data,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: id,
    }));
  },

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    })),

  deleteNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    })),

  setSelectedNodeId: (nodeId) =>
    set(() => ({ selectedNodeId: nodeId })),

  resetCanvas: () =>
    set(() => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      executionLogs: [],
      executionTraces: [],
      totalTokens: 0,
      totalCost: 0.0,
    })),

  addExecutionLog: (log) =>
    set((state) => ({
      executionLogs: [...state.executionLogs, log],
    })),

  addExecutionTrace: (trace) =>
    set((state) => {
      // Update existing trace if nodeId exists, otherwise add new
      const existingIndex = state.executionTraces.findIndex(t => t.nodeId === trace.nodeId);
      if (existingIndex !== -1) {
        const newTraces = [...state.executionTraces];
        newTraces[existingIndex] = { ...newTraces[existingIndex], ...trace };
        return { executionTraces: newTraces };
      } else {
        return { executionTraces: [...state.executionTraces, trace] };
      }
    }),

  setTotalTokens: (tokens) => set(() => ({ totalTokens: tokens })),

  setTotalCost: (cost) => set(() => ({ totalCost: cost })),

  serializeWorkflow: () => {
    const { nodes, edges } = get();

    // Validate
    const hasTrigger = nodes.some((n) => n.type === "trigger");
    const hasAgent = nodes.some((n) => n.type === "agent");
    const hasCycles = hasCycle(nodes, edges);

    const orphans = nodes.filter(
      (node) =>
        !edges.some((e) => e.source === node.id || e.target === node.id) &&
        nodes.length > 1
    );

    if (!hasTrigger) {
      return { success: false, error: "Workflow must contain at least one Trigger node" };
    }
    if (!hasAgent) {
      return { success: false, error: "Workflow must contain at least one Agent node" };
    }
    if (hasCycles) {
      return { success: false, error: "Workflow contains cyclic dependencies" };
    }
    if (orphans.length > 0) {
      return { success: false, error: "Workflow contains orphaned nodes" };
    }

    return {
      success: true,
      data: {
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      },
    };
  },
}));
