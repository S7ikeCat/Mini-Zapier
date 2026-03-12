"use client";

type PaletteNodeKind = "TRIGGER" | "ACTION";

export type PaletteNodeType =
  | "WEBHOOK"
  | "SCHEDULE"
  | "EMAIL"
  | "EMAIL_TRIGGER"
  | "HTTP"
  | "TELEGRAM"
  | "DATABASE"
  | "TRANSFORM";

export type PaletteItemData = {
  kind: PaletteNodeKind;
  type: PaletteNodeType;
  label: string;
};

interface NodePaletteProps {
  onAddNode: (item: PaletteItemData) => void;
}

const triggerItems: PaletteItemData[] = [
  { kind: "TRIGGER", type: "WEBHOOK", label: "Webhook" },
  { kind: "TRIGGER", type: "SCHEDULE", label: "Schedule" },
  { kind: "TRIGGER", type: "EMAIL_TRIGGER", label: "Email" },
];

const actionItems: PaletteItemData[] = [
  { kind: "ACTION", type: "HTTP", label: "HTTP Request" },
  { kind: "ACTION", type: "EMAIL", label: "Email" },
  { kind: "ACTION", type: "TELEGRAM", label: "Telegram" },
  { kind: "ACTION", type: "DATABASE", label: "Database" },
  { kind: "ACTION", type: "TRANSFORM", label: "Transform" },
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="h-full w-[240px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#08101d] px-3 py-4">
      <div className="space-y-4">
        <div>
        <h2 className="mb-3 text-base font-semibold text-white">Triggers</h2>
          <div className="space-y-3">
            {triggerItems.map((item) => (
              <PaletteItem
                key={`${item.kind}-${item.type}`}
                label={item.label}
                onClick={() => onAddNode(item)}
              />
            ))}
          </div>
        </div>

        <div className="pt-6">
        <h2 className="mb-3 text-base font-semibold text-white">Actions</h2>
          <div className="space-y-3">
            {actionItems.map((item) => (
              <PaletteItem
                key={`${item.kind}-${item.type}`}
                label={item.label}
                onClick={() => onAddNode(item)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaletteItem({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-white/10 p-3 text-left text-white/80 transition hover:bg-white/5 hover:text-white"
    >
      {label}
    </button>
  );
}