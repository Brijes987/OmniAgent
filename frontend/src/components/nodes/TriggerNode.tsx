
import { Handle, Position, NodeProps } from "reactflow";
import { TriggerNodeData } from "@/store/useWorkflowStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { Zap, Clock } from "lucide-react";

export default function TriggerNode({ data, selected, id }: NodeProps<TriggerNodeData>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <div
      className={`rounded-xl border-2 bg-background shadow-lg min-w-[220px] transition-all duration-200 ${selected ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-emerald-500/50"}`}
    >
      <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
        <Zap className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {data.name}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Trigger Type
          </label>
          <select
            value={data.triggerType}
            onChange={(e) =>
              updateNodeData(id, { triggerType: e.target.value as "webhook" | "schedule" })
            }
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="webhook">Webhook Ingestion</option>
            <option value="schedule">Interval Schedule</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            {data.triggerType === "webhook" ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            Configuration
          </label>
          <input
            type="text"
            value={data.config}
            onChange={(e) => updateNodeData(id, { config: e.target.value })}
            placeholder={
              data.triggerType === "webhook"
                ? "e.g., /api/webhook/order-placed"
                : "e.g., 0 * * * *"
            }
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500" />
    </div>
  );
}
