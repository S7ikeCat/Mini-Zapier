"use client";

import { Trash2 } from "lucide-react";

type EditableNode = {
  id: string;
  name: string;
  type: string;
  kind: "TRIGGER" | "ACTION";
  description: string | null;
  retryLimit: number;
  retryDelayMs: number;
  timeoutMs: number | null;
  isEnabled: boolean;
};

interface NodeSettingsPanelProps {
  node: EditableNode | null;
  onChange: (nodeId: string, patch: Partial<EditableNode>) => void;
  onDelete: (nodeId: string) => void;
}

export function NodeSettingsPanel({
  node,
  onChange,
  onDelete,
}: NodeSettingsPanelProps) {
  if (!node) {
    return null;
  }

  return (
    <aside className="h-full w-[300px] shrink-0 border-l border-white/10 bg-[#08101d]">
      <div className="h-full overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Node settings
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {node.name || "Untitled node"}
            </h2>
            <p className="mt-1 text-sm text-white/45">
              {node.kind} · {node.type}
            </p>
          </div>

          <Field label="Name">
            <input
              value={node.name}
              onChange={(e) => onChange(node.id, { name: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              placeholder="Node name"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={node.description ?? ""}
              onChange={(e) =>
                onChange(node.id, {
                  description: e.target.value || null,
                })
              }
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              placeholder="Node description"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Retry limit">
              <input
                type="number"
                min={0}
                value={node.retryLimit}
                onChange={(e) =>
                  onChange(node.id, {
                    retryLimit: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />
            </Field>

            <Field label="Retry delay ms">
              <input
                type="number"
                min={0}
                value={node.retryDelayMs}
                onChange={(e) =>
                  onChange(node.id, {
                    retryDelayMs: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />
            </Field>
          </div>

          <Field label="Timeout ms">
            <input
              type="number"
              min={0}
              value={node.timeoutMs ?? ""}
              onChange={(e) =>
                onChange(node.id, {
                  timeoutMs: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              placeholder="Optional timeout"
            />
          </Field>

          <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="pr-4">
              <p className="text-sm font-medium text-white">Enabled</p>
              <p className="text-xs text-white/45">
                Node participates in execution
              </p>
            </div>

            <input
              type="checkbox"
              checked={node.isEnabled}
              onChange={(e) =>
                onChange(node.id, {
                  isEnabled: e.target.checked,
                })
              }
              className="h-5 w-5 shrink-0 accent-cyan-400"
            />
          </label>

          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-400/15"
          >
            <Trash2 className="h-4 w-4" />
            Delete node
          </button>
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">
        {label}
      </p>
      {children}
    </div>
  );
}