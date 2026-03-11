"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Webhook,
  Clock3,
  Mail,
  Send,
  Database,
  Shuffle,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

type WorkflowNodeData = {
  label: string;
  kind: string;
  type: string;
  isEnabled?: boolean;
  savedIsEnabled?: boolean;
  runtimeStatus?: string | null;
  showScheduleActive?: boolean;
};

function getNodeAccent(type: string) {
  switch (type) {
    case "WEBHOOK":
      return "from-cyan-400/20 to-blue-500/20 border-cyan-400/30";
    case "SCHEDULE":
      return "from-violet-400/20 to-fuchsia-500/20 border-violet-400/30";
    case "EMAIL":
      return "from-amber-400/20 to-orange-500/20 border-amber-400/30";
    case "HTTP":
      return "from-emerald-400/20 to-teal-500/20 border-emerald-400/30";
    case "DATABASE":
      return "from-indigo-400/20 to-sky-500/20 border-indigo-400/30";
    case "TRANSFORM":
      return "from-pink-400/20 to-rose-500/20 border-pink-400/30";
    default:
      return "from-white/10 to-white/5 border-white/15";
  }
}

function NodeIcon({ type }: { type: string }) {
  if (type === "WEBHOOK") {
    return <Webhook className="h-5 w-5 text-white" />;
  }

  if (type === "SCHEDULE") {
    return <Clock3 className="h-5 w-5 text-white" />;
  }

  if (type === "EMAIL") {
    return <Mail className="h-5 w-5 text-white" />;
  }

  if (type === "HTTP") {
    return <Send className="h-5 w-5 text-white" />;
  }

  if (type === "DATABASE") {
    return <Database className="h-5 w-5 text-white" />;
  }

  if (type === "TRANSFORM") {
    return <Shuffle className="h-5 w-5 text-white" />;
  }

  return <Webhook className="h-5 w-5 text-white" />;
}

function getRuntimeTone(status: string | null | undefined): string {
  switch (status) {
    case "RUNNING":
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
    case "RETRYING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-200";
    case "FAILED":
      return "border-rose-400/20 bg-rose-400/10 text-rose-200";
    case "SUCCESS":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}

export function WorkflowNode({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;

  const isPaused =
    nodeData.type === "SCHEDULE" && nodeData.savedIsEnabled === false;

  const isScheduleActive =
    nodeData.type === "SCHEDULE" &&
    nodeData.savedIsEnabled !== false &&
    nodeData.showScheduleActive === true;

  return (
    <div
      className={cn(
        "relative min-w-60 rounded-2xl border bg-[#0b1728] shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition",
        "bg-linear-to-br",
        getNodeAccent(nodeData.type),
        selected ? "ring-2 ring-cyan-400/70" : "ring-0",
        isPaused && "opacity-50 ring-1 ring-amber-400/40",
        isScheduleActive && "shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_0_24px_rgba(16,185,129,0.18)]"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="h-3! w-3! border-2! border-[#07111f]! bg-cyan-300!"
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/10">
            <NodeIcon type={nodeData.type} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
              {nodeData.kind}
            </p>
            <h3 className="truncate text-sm font-semibold text-white">
              {nodeData.label}
            </h3>
            <p className="mt-1 text-xs text-white/55">{nodeData.type}</p>

            <div className="mt-2 flex flex-wrap gap-2">
              {isPaused ? (
                <div className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-200">
                  Paused
                </div>
              ) : null}

              {isScheduleActive ? (
                <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-200">
                  Active!
                </div>
              ) : null}

              {nodeData.runtimeStatus ? (
                <div
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
                    getRuntimeTone(nodeData.runtimeStatus)
                  )}
                >
                  {nodeData.runtimeStatus}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="h-3! w-3! border-2! border-[#07111f]! bg-cyan-300!"
      />
    </div>
  );
}