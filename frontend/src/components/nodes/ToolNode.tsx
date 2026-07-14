
import { Handle, Position, NodeProps } from "reactflow";
import { ToolNodeData } from "@/store/useWorkflowStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { Wrench } from "lucide-react";

export default function ToolNode({ data, selected, id }: NodeProps<ToolNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <div
      className={`rounded-xl border-2 bg-background shadow-lg min-w-[220px] transition-all duration-200 ${selected ? "border-purple-500 ring-2 ring-purple-500/30" : "border-purple-500/50"}`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
      <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2">
        <Wrench className="w-5 h-5 text-purple-500" />
        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
          {data.name}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Tool Type
          </label>
          <select
            value={data.toolType}
            onChange={(e) =>
              updateNodeData(id, {
                toolType: e.target.value as
                  | "web-search"
                  | "vector-db"
                  | "slack-notify"
                  | "postgres-query",
              })
            }
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="web-search">Web Search</option>
            <option value="vector-db">Vector DB</option>
            <option value="slack-notify">Slack Notify</option>
            <option value="postgres-query">PostgreSQL Query</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Parameters (JSON)
          </label>
          <textarea
            value={JSON.stringify(data.parameters, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateNodeData(id, { parameters: parsed });
              } catch (err) {
                // Ignore invalid JSON while typing
              }
            }}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono resize-none"
            placeholder='{"key": "value"}'
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500" />
    </div>
  );
}
