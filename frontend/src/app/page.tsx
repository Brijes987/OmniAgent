
"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  Panel,
  Node,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import TriggerNode from "@/components/nodes/TriggerNode";
import AgentNode from "@/components/nodes/AgentNode";
import ToolNode from "@/components/nodes/ToolNode";
import { ExecutionTimeline } from "@/components/ExecutionTimeline";
import {
  useWorkflowStore,
  TriggerNodeData,
  AgentNodeData,
  ToolNodeData,
  ExecutionTrace,
} from "@/store/useWorkflowStore";
import { getSocket, connectSocket, disconnectSocket } from "@/utils/socket";
import {
  Zap,
  Bot,
  Wrench,
  Play,
  Trash2,
  RotateCcw,
  Activity,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  tool: ToolNode,
};

function Builder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    nodes,
    edges,
    selectedNodeId,
    executionLogs,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNodeId,
    deleteNode,
    resetCanvas,
    addExecutionLog,
    serializeWorkflow,
    addExecutionTrace,
    setTotalTokens,
    setTotalCost,
  } = useWorkflowStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      setConnectionStatus("connected");
      addExecutionLog("[System] Connected to backend gateway");
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
      addExecutionLog("[System] Disconnected from backend gateway");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("execution-trace", (data: any) => {
      // Handle both old string logs and new trace objects
      if (typeof data === "string") {
        addExecutionLog(data);
      } else {
        // Add trace
        addExecutionTrace({
          nodeId: data.nodeId,
          nodeType: data.nodeType,
          status: data.status,
          durationMs: data.durationMs,
          tokensUsed: data.tokensUsed,
          cost: data.cost,
          outputData: data.outputData,
          message: data.message,
        } as ExecutionTrace);

        // Update totals if present
        if (data.totalTokens !== undefined) {
          setTotalTokens(data.totalTokens);
        }
        if (data.totalCost !== undefined) {
          setTotalCost(data.totalCost);
        }

        // Also add a log message
        const logMsg = `[${data.nodeType.toUpperCase()}] Node ${data.nodeId.slice(0, 8)}: ${data.status}`;
        addExecutionLog(logMsg);
      }
    });

    // Try initial connection
    setConnectionStatus("connecting");
    connectSocket().catch(() => setConnectionStatus("disconnected"));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("execution-trace");
      disconnectSocket();
    };
  }, [addExecutionLog, addExecutionTrace, setTotalTokens, setTotalCost]);

  const handleRunSimulation = async () => {
    setValidationError(null);
    const result = serializeWorkflow();

    if (!result.success) {
      setValidationError(result.error!);
      return;
    }

    const socket = getSocket();
    if (socket.connected) {
      socket.emit("execute-workflow", result.data);
      addExecutionLog("[System] Workflow submitted for execution");
    } else {
      setValidationError("Not connected to backend gateway");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, type: "trigger" | "agent" | "tool") => {
    e.preventDefault();
    const position = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    addNode(type, position);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card flex items-center justify-between px-6 py-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">
            OmniAgent Workflow Orchestrator
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
              connectionStatus === "connected"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : connectionStatus === "connecting"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                : "bg-red-500/10 text-red-600 border-red-500/30"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                connectionStatus === "connected"
                  ? "bg-emerald-500"
                  : connectionStatus === "connecting"
                  ? "bg-amber-500"
                  : "bg-red-500"
              )}
            />
            {connectionStatus === "connected"
              ? "Live WebSockets Connected"
              : connectionStatus === "connecting"
              ? "Connecting..."
              : "Disconnected"}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={resetCanvas}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Canvas
          </Button>

          <Button
            size="sm"
            onClick={handleRunSimulation}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90"
          >
            <Play className="w-4 h-4" />
            Run Simulation
          </Button>
        </div>
      </header>

      {/* Validation Banner */}
      {validationError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-3">
          <div className="flex items-center gap-2 text-red-600">
            <span className="font-semibold text-sm">Validation Error:</span>
            <span className="text-sm">{validationError}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Palette) */}
        <aside className="w-64 bg-card border-r p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Node Palette
          </h3>

          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/reactflow", "trigger");
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "trigger")}
            onClick={() => addNode("trigger")}
            className="cursor-grab active:cursor-grabbing border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 hover:bg-emerald-500/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="font-semibold text-sm">Trigger</div>
                <div className="text-xs text-muted-foreground">
                  Webhook / Schedule
                </div>
              </div>
            </div>
          </div>

          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/reactflow", "agent");
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "agent")}
            onClick={() => addNode("agent")}
            className="cursor-grab active:cursor-grabbing border border-blue-500/30 bg-blue-500/5 rounded-xl p-4 hover:bg-blue-500/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-semibold text-sm">Agent</div>
                <div className="text-xs text-muted-foreground">
                  LLM Node
                </div>
              </div>
            </div>
          </div>

          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/reactflow", "tool");
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, "tool")}
            onClick={() => addNode("tool")}
            className="cursor-grab active:cursor-grabbing border border-purple-500/30 bg-purple-500/5 rounded-xl p-4 hover:bg-purple-500/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-purple-500" />
              <div>
                <div className="font-semibold text-sm">Tool</div>
                <div className="text-xs text-muted-foreground">
                  Web Search, DB, etc.
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
          >
            <Background color="#e5e7eb" gap={20} size={1} />
            <Controls className="bg-card border shadow-lg" />

            {/* Execution Logs Terminal */}
            {executionLogs.length > 0 && (
              <Panel
                position="bottom-center"
                className="w-full max-w-4xl mb-4"
              >
                <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
                  <div className="px-4 py-2 border-b bg-muted flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    <span className="text-sm font-semibold">Execution Logs</span>
                  </div>
                  <div className="p-4 max-h-48 overflow-y-auto font-mono text-sm">
                    {executionLogs.map((log, i) => (
                      <div key={i} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </main>

        {/* Right Panels */}
        <div className="flex flex-col h-full">
          {/* Inspector Panel */}
          {selectedNode && (
            <aside className="w-80 bg-card border-l p-4 flex flex-col gap-4 overflow-y-auto border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Node Configuration</h3>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteNode(selectedNode.id)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>

              {selectedNode.type === "trigger" && (
                <TriggerInspector
                  id={selectedNode.id}
                  data={selectedNode.data as TriggerNodeData}
                />
              )}

              {selectedNode.type === "agent" && (
                <AgentInspector
                  id={selectedNode.id}
                  data={selectedNode.data as AgentNodeData}
                />
              )}

              {selectedNode.type === "tool" && (
                <ToolInspector
                  id={selectedNode.id}
                  data={selectedNode.data as ToolNodeData}
                />
              )}
            </aside>
          )}

          {/* Execution Timeline Panel */}
          <ExecutionTimeline />
        </div>
      </div>
    </div>
  );
}

// Inspector Components
function TriggerInspector({ id, data }: { id: string; data: TriggerNodeData }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNodeData(id, { name: e.target.value })}
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Trigger Type</label>
        <select
          value={data.triggerType}
          onChange={(e) =>
            updateNodeData(id, { triggerType: e.target.value as any })
          }
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="webhook">Webhook</option>
          <option value="schedule">Schedule</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Config</label>
        <input
          type="text"
          value={data.config}
          onChange={(e) => updateNodeData(id, { config: e.target.value })}
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>
    </div>
  );
}

function AgentInspector({ id, data }: { id: string; data: AgentNodeData }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNodeData(id, { name: e.target.value })}
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Model</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
          <option value="llama-3-70b">Llama-3-70B</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Temperature: {data.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={data.temperature}
          onChange={(e) =>
            updateNodeData(id, { temperature: parseFloat(e.target.value) })
          }
          className="w-full"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">System Prompt</label>
        <textarea
          value={data.systemPrompt}
          onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>
    </div>
  );
}

function ToolInspector({ id, data }: { id: string; data: ToolNodeData }) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateNodeData(id, { name: e.target.value })}
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Tool Type</label>
        <select
          value={data.toolType}
          onChange={(e) =>
            updateNodeData(id, { toolType: e.target.value as any })
          }
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        >
          <option value="web-search">Web Search</option>
          <option value="vector-db">Vector DB</option>
          <option value="slack-notify">Slack Notify</option>
          <option value="postgres-query">PostgreSQL Query</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Parameters (JSON)</label>
        <textarea
          value={JSON.stringify(data.parameters, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              updateNodeData(id, { parameters: parsed });
            } catch (err) {
              // ignore
            }
          }}
          rows={8}
          className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-xs resize-none"
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}
