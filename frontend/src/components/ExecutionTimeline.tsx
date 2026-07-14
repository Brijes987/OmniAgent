import React from "react";
import { useWorkflowStore, ExecutionTrace } from "../store/useWorkflowStore";

export const ExecutionTimeline: React.FC = () => {
  const { executionTraces, totalTokens, totalCost } = useWorkflowStore();

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800 text-slate-100 p-6 w-96 font-sans">
      <div className="flex flex-col gap-2 mb-6 border-b border-slate-800 pb-4">
        <h3 className="text-lg font-bold tracking-tight">FinOps Observability</h3>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
            <span className="text-xs text-slate-400 block font-medium">Aggregated Cost</span>
            <span className="text-lg font-bold text-emerald-400">${totalCost.toFixed(5)}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
            <span className="text-xs text-slate-400 block font-medium">Accumulated Tokens</span>
            <span className="text-lg font-bold text-blue-400">{totalTokens.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-slate-300 tracking-wider uppercase mb-4">Diagnostic Trace</h4>

      <div className="flex-1 overflow-y-auto space-y-6 relative pl-4 border-l-2 border-slate-800">
        {executionTraces.map((trace: ExecutionTrace) => {
          const isCompleted = trace.status === "COMPLETED";
          const isFailed = trace.status === "FAILED";
          const isRunning = trace.status === "RUNNING";

          let statusDotColor = "bg-slate-800 border-slate-700";
          if (isCompleted) statusDotColor = "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
          if (isFailed) statusDotColor = "bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]";
          if (isRunning) statusDotColor = "bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)] animate-pulse";

          return (
            <div key={trace.nodeId} className="relative group">
              <div
                className={`absolute -left-[25px] top-1 w-[12px] h-[12px] rounded-full border-2 ${statusDotColor} transition-all duration-300`}
              />

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200 capitalize">
                    {trace.nodeType} Node
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCompleted
                        ? "bg-emerald-500/10 text-emerald-400"
                        : isFailed
                        ? "bg-red-500/10 text-red-400"
                        : isRunning
                        ? "bg-blue-500/10 text-blue-400 animate-pulse"
                        : "bg-slate-800/50 text-slate-400"
                    }`}
                  >
                    {trace.status}
                  </span>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-lg flex flex-col gap-1.5 mt-1 transition-all group-hover:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Node ID</span>
                    <span className="font-mono text-[11px] text-slate-300">{trace.nodeId.slice(0, 8)}</span>
                  </div>
                  {isCompleted && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Step Cost</span>
                        <span className="font-semibold text-emerald-400">
                          ${trace.cost?.toFixed(5) || "0.00000"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Step Latency</span>
                        <span className="font-semibold text-slate-300">{trace.durationMs}ms</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Step Tokens</span>
                        <span className="font-semibold text-blue-400">{trace.tokensUsed}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
