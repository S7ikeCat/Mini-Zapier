"use client";

import type { ChangeEvent, ReactNode } from "react";
import { Trash2 } from "lucide-react";

export type EditableNode = {
  id: string;
  name: string;
  type: string;
  kind: "TRIGGER" | "ACTION";
  description: string | null;
  retryLimit: number;
  retryDelayMs: number;
  timeoutMs: number | null;
  isEnabled: boolean;
  config?: Record<string, unknown> | null;
};

interface NodeSettingsPanelProps {
  node: EditableNode | null;
  onChange: (nodeId: string, patch: Partial<EditableNode>) => void;
  onDelete: (nodeId: string) => void;
}

function getConfigValue(
  config: Record<string, unknown> | null | undefined,
  key: string
): unknown {
  if (!config || typeof config !== "object") {
    return undefined;
  }

  return config[key];
}

function getConfigString(
  config: Record<string, unknown> | null | undefined,
  key: string,
  fallback = ""
): string {
  const value = getConfigValue(config, key);

  return typeof value === "string" ? value : fallback;
}

function getConfigObject(
  config: Record<string, unknown> | null | undefined,
  key: string
): Record<string, unknown> {
  const value = getConfigValue(config, key);

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function NodeSettingsPanel({
  node,
  onChange,
  onDelete,
}: NodeSettingsPanelProps) {
  if (!node) {
    return null;
  }

  const config =
    node.config && typeof node.config === "object" ? node.config : {};

  const patchConfig = (patch: Record<string, unknown>) => {
    onChange(node.id, {
      config: {
        ...config,
        ...patch,
      },
    });
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(node.id, { name: e.target.value });
  };

  const handleDescriptionChange = (
    e: ChangeEvent<HTMLTextAreaElement>
  ) => {
    onChange(node.id, {
      description: e.target.value || null,
    });
  };

  const handleRetryLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(node.id, {
      retryLimit: Number(e.target.value) || 0,
    });
  };

  const handleRetryDelayChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(node.id, {
      retryDelayMs: Number(e.target.value) || 0,
    });
  };

  const handleTimeoutChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(node.id, {
      timeoutMs: e.target.value ? Number(e.target.value) : null,
    });
  };

  const handleEnabledChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(node.id, {
      isEnabled: e.target.checked,
    });
  };

  const renderWebhookSettings = () => {
    const path = getConfigString(node.config, "path");
    const secret = getConfigString(node.config, "secret");

    return (
      <>
        <Field label="Webhook path">
          <input
            value={path}
            onChange={(e) => patchConfig({ path: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="lead-capture"
          />
        </Field>

        <Field label="Secret">
          <input
            value={secret}
            onChange={(e) => patchConfig({ secret: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Optional webhook secret"
          />
        </Field>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-cyan-300/80">
            Endpoint preview
          </p>
          <code className="mt-2 block break-all text-sm text-cyan-100">
            POST /api/hooks/{path || "<path>"}
          </code>
        </div>
      </>
    );
  };

  const renderHttpSettings = () => {
    const method = getConfigString(node.config, "method", "POST");
    const url = getConfigString(node.config, "url");
    const bodyValue = getConfigValue(node.config, "body");

    const bodyText =
      typeof bodyValue === "string"
        ? bodyValue
        : JSON.stringify(bodyValue ?? {}, null, 2);

    return (
      <>
        <Field label="Method">
          <select
            value={method}
            onChange={(e) => patchConfig({ method: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="GET" className="bg-[#08101d]">
              GET
            </option>
            <option value="POST" className="bg-[#08101d]">
              POST
            </option>
            <option value="PUT" className="bg-[#08101d]">
              PUT
            </option>
            <option value="PATCH" className="bg-[#08101d]">
              PATCH
            </option>
            <option value="DELETE" className="bg-[#08101d]">
              DELETE
            </option>
          </select>
        </Field>

        <Field label="URL">
          <input
            value={url}
            onChange={(e) => patchConfig({ url: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="https://httpbin.org/post"
          />
        </Field>

        <Field label="Body JSON">
          <textarea
            value={bodyText}
            onChange={(e) => {
              const raw = e.target.value;

              try {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                patchConfig({ body: parsed });
              } catch {
                patchConfig({ body: raw });
              }
            }}
            rows={8}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/25"
            placeholder={`{\n  "email": "{{payload.email}}"\n}`}
          />
        </Field>
      </>
    );
  };

  const renderTelegramSettings = () => {
    const chatId = getConfigString(node.config, "chatId");
    const text = getConfigString(
      node.config,
      "text",
      "Workflow notification"
    );

    return (
      <>
        <Field label="Chat ID">
          <input
            value={chatId}
            onChange={(e) => patchConfig({ chatId: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="123456789"
          />
        </Field>

        <Field label="Message">
          <textarea
            value={text}
            onChange={(e) => patchConfig({ text: e.target.value })}
            rows={6}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Workflow failed: {{payload.email}}"
          />
        </Field>
      </>
    );
  };

  const renderTransformSettings = () => {
    const mapping = getConfigObject(node.config, "mapping");

    return (
      <Field label="Mapping JSON">
        <textarea
          value={JSON.stringify(mapping, null, 2)}
          onChange={(e) => {
            const raw = e.target.value;

            try {
              const parsed = JSON.parse(raw) as Record<string, unknown>;
              patchConfig({ mapping: parsed });
            } catch {
              patchConfig({ mapping: {} });
            }
          }}
          rows={8}
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/25"
          placeholder={`{\n  "email": "{{payload.email}}"\n}`}
        />
      </Field>
    );
  };

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
              onChange={handleNameChange}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              placeholder="Node name"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={node.description ?? ""}
              onChange={handleDescriptionChange}
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              placeholder="Node description"
            />
          </Field>

          {node.type === "WEBHOOK" && renderWebhookSettings()}
          {node.type === "HTTP" && renderHttpSettings()}
          {node.type === "TELEGRAM" && renderTelegramSettings()}
          {node.type === "TRANSFORM" && renderTransformSettings()}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Retry limit">
              <input
                type="number"
                min={0}
                value={node.retryLimit}
                onChange={handleRetryLimitChange}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />
            </Field>

            <Field label="Retry delay ms">
              <input
                type="number"
                min={0}
                value={node.retryDelayMs}
                onChange={handleRetryDelayChange}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              />
            </Field>
          </div>

          <Field label="Timeout ms">
            <input
              type="number"
              min={0}
              value={node.timeoutMs ?? ""}
              onChange={handleTimeoutChange}
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
              onChange={handleEnabledChange}
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
  children: ReactNode;
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