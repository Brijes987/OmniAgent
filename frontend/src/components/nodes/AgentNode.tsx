
import { Handle, Position, NodeProps } from "reactflow";
import { AgentNodeData } from "@/store/useWorkflowStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { Bot } from "lucide-react";

export default function AgentNode({ data, selected, id }: NodeProps<AgentNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <div
      className={`rounded-xl border-2 bg-background shadow-lg min-w-[260px] transition-all duration-200 ${selected ? "border-blue-500 ring-2 ring-blue-500/30" : "border-blue-500/50"}`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <div className="px-4 py-3 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-2">
        <Bot className="w-5 h-5 text-blue-500" />
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          {data.name}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Agent Name
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => updateNodeData(id, { name: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            LLM Engine
          </label>
          <select
            value={data.model}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="llama-3-70b">Llama-3-70B</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
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
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            System Prompt
          </label>
          <textarea
            value={data.systemPrompt}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}
