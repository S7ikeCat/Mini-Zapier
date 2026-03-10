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

export function WorkflowNode({ data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;

  return (
    <div
      className={cn(
        "relative min-w-60 rounded-2xl border bg-[#0b1728] shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition",
        "bg-linear-to-br",
        getNodeAccent(nodeData.type),
        selected ? "ring-2 ring-cyan-400/70" : "ring-0"
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