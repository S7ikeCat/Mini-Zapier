"use client";

import { Eye, EyeOff } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { CronExpressionParser } from "cron-parser";

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

function getSchedulePreview(
  cron: string,
  timezone: string
): {
  isValid: boolean;
  nextRunLabel: string;
  error: string | null;
} {
  const normalizedCron = cron.trim();
  const normalizedTimezone = timezone.trim();

  if (!normalizedCron) {
    return {
      isValid: false,
      nextRunLabel: "Enter cron expression",
      error: null,
    };
  }

  try {
    const interval = CronExpressionParser.parse(normalizedCron, {
      currentDate: new Date(),
      ...(normalizedTimezone ? { tz: normalizedTimezone } : {}),
    });

    const nextRun = interval.next().toDate();

    return {
      isValid: true,
      nextRunLabel: nextRun.toLocaleString(),
      error: null,
    };
  } catch (error) {
    return {
      isValid: false,
      nextRunLabel: "Invalid cron expression",
      error: error instanceof Error ? error.message : "Invalid cron expression",
    };
  }
}

function parseCronParts(cron: string): [string, string, string, string, string] {
  const parts = cron.trim().split(/\s+/);

  return [
    parts[0] ?? "*",
    parts[1] ?? "*",
    parts[2] ?? "*",
    parts[3] ?? "*",
    parts[4] ?? "*",
  ];
}

function buildCronFromParts(parts: [string, string, string, string, string]): string {
  return parts.map((part) => part.trim() || "*").join(" ");
}

function normalizeCronPart(value: string): string {
  const normalized = value.replace(/\s+/g, "").trim();

  if (!normalized) {
    return "*";
  }

  return normalized;
}

export function NodeSettingsPanel({
  node,
  onChange,
  onDelete,
}: NodeSettingsPanelProps) {

  const [showBotToken, setShowBotToken] = useState(false);
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
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

  const renderEmailTriggerSettings = () => {
    const fromFilter = getConfigString(node.config, "fromFilter");
    const subjectContains = getConfigString(node.config, "subjectContains");
  
    return (
      <>
        <Field label="Accept from">
          <input
            value={fromFilter}
            onChange={(e) => patchConfig({ fromFilter: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="client@example.com"
          />
        </Field>
  
        <Field label="Subject contains">
          <input
            value={subjectContains}
            onChange={(e) => patchConfig({ subjectContains: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Lead"
          />
        </Field>
  
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-cyan-300/80">
            Inbound endpoint
          </p>
          <code className="mt-2 block break-all text-sm text-cyan-100">
            POST /api/inbound/email
          </code>
        </div>
      </>
    );
  };

  const renderEmailSettings = () => {
    const smtpHost = getConfigString(node.config, "smtpHost");
    const smtpPort = getConfigString(node.config, "smtpPort", "587");
    const smtpUser = getConfigString(node.config, "smtpUser");
    const smtpPass = getConfigString(node.config, "smtpPass");
    const to = getConfigString(node.config, "to");
    const subject = getConfigString(node.config, "subject");
    const text = getConfigString(
      node.config,
      "text",
      "Workflow notification"
    );
  
    return (
      <>
        <Field label="SMTP host">
          <input
            value={smtpHost}
            onChange={(e) => patchConfig({ smtpHost: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="smtp.gmail.com"
          />
        </Field>
  
        <Field label="SMTP port">
          <input
            value={smtpPort}
            onChange={(e) => patchConfig({ smtpPort: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="587"
          />
        </Field>
  
        <Field label="SMTP user">
          <input
            value={smtpUser}
            onChange={(e) => patchConfig({ smtpUser: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Your@example.com"
          />
        </Field>
  
        <Field label="SMTP password">
          <div className="flex gap-2">
            <input
              type={showSmtpPassword ? "text" : "password"}
              value={smtpPass}
              onChange={(e) => patchConfig({ smtpPass: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              placeholder="Пароль приложения Google"
            />
  
            <button
              type="button"
              onClick={() => setShowSmtpPassword((prev) => !prev)}
              className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
            >
              {showSmtpPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>
  
        <Field label="To">
          <input
            value={to}
            onChange={(e) => patchConfig({ to: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Your@example.com"
          />
        </Field>
  
        <Field label="Subject">
          <input
            value={subject}
            onChange={(e) => patchConfig({ subject: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Тема письма"
          />
        </Field>
  
        <Field label="Message">
          <textarea
            value={text}
            onChange={(e) => patchConfig({ text: e.target.value })}
            rows={6}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Текст письма"
          />
        </Field>
      </>
    );
  };

  const renderDatabaseSettings = () => {
    const provider = getConfigString(node.config, "provider", "postgres");
    const connectionString = getConfigString(node.config, "connectionString");
    const query = getConfigString(node.config, "query");
    const mode = getConfigString(node.config, "mode", "select");
  
    return (
      <>
        <Field label="Database type">
          <select
            value={provider}
            onChange={(e) => patchConfig({ provider: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="postgres" className="bg-[#08101d]">
              PostgreSQL
            </option>
          </select>
        </Field>
  
        <Field label="Mode">
          <select
            value={mode}
            onChange={(e) => patchConfig({ mode: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="select" className="bg-[#08101d]">
              Select
            </option>
            <option value="execute" className="bg-[#08101d]">
              Execute
            </option>
          </select>
        </Field>
  
        <Field label="Connection string">
          <div className="flex gap-2">
            <input
              type={showConnectionString ? "text" : "password"}
              value={connectionString}
              onChange={(e) => patchConfig({ connectionString: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              placeholder="postgresql://user:password@host:5432/dbname"
            />
  
            <button
              type="button"
              onClick={() => setShowConnectionString((prev) => !prev)}
              className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
            >
              {showConnectionString ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>
  
        <Field label="SQL query">
          <textarea
            value={query}
            onChange={(e) => patchConfig({ query: e.target.value })}
            rows={8}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-white/25"
            placeholder={`SELECT NOW() AS current_time;`}
          />
        </Field>
      </>
    );
  };

  const renderScheduleSettings = () => {
    const cron = getConfigString(node.config, "cron", "* * * * *");
    const detectedTimezone =
  Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = getConfigString(node.config, "timezone", "");
  
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parseCronParts(cron);
    const preview = getSchedulePreview(cron, timezone);
  
    const updateCronPart = (
      index: 0 | 1 | 2 | 3 | 4,
      value: string
    ) => {
      const parts = parseCronParts(cron);
      parts[index] = normalizeCronPart(value);
  
      patchConfig({
        cron: buildCronFromParts(parts),
      });
    };
  
    const applyPreset = (presetCron: string) => {
      patchConfig({
        cron: presetCron,
      });
    };
  
    const isPaused = node.isEnabled === false;

    
  
    return (
      <>
        <div className="grid grid-cols-5 gap-2">
          <Field label="Min">
            <input
              value={minute}
              onChange={(e) => updateCronPart(0, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-white outline-none placeholder:text-white/25"
              placeholder="*"
              maxLength={20}
            />
          </Field>
  
          <Field label="Hr">
            <input
              value={hour}
              onChange={(e) => updateCronPart(1, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-white outline-none placeholder:text-white/25"
              placeholder="*"
              maxLength={20}
            />
          </Field>
  
          <Field label="Day">
            <input
              value={dayOfMonth}
              onChange={(e) => updateCronPart(2, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-white outline-none placeholder:text-white/25"
              placeholder="*"
              maxLength={20}
            />
          </Field>
  
          <Field label="Mon">
            <input
              value={month}
              onChange={(e) => updateCronPart(3, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-white outline-none placeholder:text-white/25"
              placeholder="*"
              maxLength={20}
            />
          </Field>
  
          <Field label="Week">
            <input
              value={dayOfWeek}
              onChange={(e) => updateCronPart(4, e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-white outline-none placeholder:text-white/25"
              placeholder="*"
              maxLength={20}
            />
          </Field>
        </div>
  
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">
            Cron expression
          </p>
          <code className="mt-2 block break-all text-sm text-white/80">{cron}</code>
        </div>
  
        <Field label="Timezone">
          <input
            value={timezone}
            onChange={(e) => patchConfig({ timezone: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Europe/Amsterdam"
          />
          <div className="mt-2 flex items-center gap-2">
  <button
    type="button"
    onClick={() =>
      patchConfig({
        timezone: detectedTimezone,
      })
    }
    className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-400/15"
  >
    Detect automatically
  </button>


</div>
        </Field>
  
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset("* * * * *")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10"
          >
            Every minute
          </button>
  
          <button
            type="button"
            onClick={() => applyPreset("*/5 * * * *")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10"
          >
            Every 5 min
          </button>
  
          <button
            type="button"
            onClick={() => applyPreset("0 * * * *")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10"
          >
            Every hour
          </button>
  
          <button
            type="button"
            onClick={() => applyPreset("0 9 * * *")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10"
          >
            Daily 09:00
          </button>
        </div>
  
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              onChange(node.id, {
                isEnabled: isPaused,
              })
            }
            className="flex-1 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-200 transition hover:bg-amber-400/15"
          >
            {isPaused ? "Resume schedule" : "Pause schedule"}
          </button>
  
          <button
            type="button"
            onClick={() =>
              patchConfig({
                cron: "",
                timezone: "",
              })
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10"
          >
            Clear
          </button>
        </div>
  
        <div
          className={`rounded-2xl border px-4 py-3 ${
            preview.isValid
              ? "border-emerald-400/20 bg-emerald-400/10"
              : "border-amber-400/20 bg-amber-400/10"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-[0.15em] ${
              preview.isValid ? "text-emerald-300/80" : "text-amber-300/80"
            }`}
          >
            Schedule preview
          </p>
  
          <p className="mt-2 text-sm text-white">
            {isPaused ? "Schedule is paused" : `Next run: ${preview.nextRunLabel}`}
          </p>
  
          <p className="mt-1 text-xs text-white/55">
            Timezone: {timezone || "Server default"}
          </p>
  
          {preview.error ? (
            <p className="mt-2 text-xs text-amber-200">{preview.error}</p>
          ) : null}
        </div>
      </>
    );
  };

  const renderWebhookSettings = () => {
    const httpStarterOnly = getConfigValue(node.config, "httpStarterOnly") === true;
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

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
  <label className="flex items-start gap-3">
    <input
      type="checkbox"
      checked={httpStarterOnly}
      onChange={(e) =>
        patchConfig({ httpStarterOnly: e.target.checked })
      }
      className="mt-1 h-4 w-4 rounded border border-white/20 bg-transparent"
    />
    <div>
      <p className="text-sm font-medium text-white">
        HTTP starter only
      </p>
      <p className="mt-1 text-xs text-white/45">
        This webhook starts only its own HTTP branch and does not continue to shared downstream nodes.
      </p>
    </div>
  </label>
</div>

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
    const botToken = getConfigString(node.config, "botToken");
    const botUsername = getConfigString(node.config, "botUsername");
    const chatId = getConfigString(node.config, "chatId");
    const text = getConfigString(
      node.config,
      "text",
      "Workflow notification"
    );
  
    const cleanUsername = botUsername.replace(/^@/, "");
  
    return (
      <>
        <Field label="Bot token">
          <div className="flex gap-2">
            <input
              type={showBotToken ? "text" : "password"}
              value={botToken}
              onChange={(e) => patchConfig({ botToken: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              placeholder="Telegram bot token"
            />
  
            <button
              type="button"
              onClick={() => setShowBotToken(!showBotToken)}
              className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
            >
              {showBotToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>
  
        <Field label="Bot username">
          <input
            value={botUsername}
            onChange={(e) => patchConfig({ botUsername: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="MiZapierbot"
          />
        </Field>
  
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.15em] text-white/45">
            Bot link
          </p>
  
          {cleanUsername ? (
            <a
              href={`https://t.me/${cleanUsername}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-sm text-cyan-300 hover:text-cyan-200"
            >
              https://t.me/{cleanUsername}
            </a>
          ) : (
            <p className="mt-2 text-sm text-white/35">
              Enter bot username to generate link
            </p>
          )}
        </div>
  
        <Field label="Chat ID">
          <input
            value={chatId}
            onChange={(e) => patchConfig({ chatId: e.target.value })}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="816249570"
          />
        </Field>
  
        <Field label="Message">
          <textarea
            value={text}
            onChange={(e) => patchConfig({ text: e.target.value })}
            rows={6}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            placeholder="Workflow notification"
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
          {node.type === "EMAIL" && renderEmailSettings()}
          {node.type === "EMAIL_TRIGGER" && renderEmailTriggerSettings()}
          {node.type === "TELEGRAM" && renderTelegramSettings()}
          {node.type === "DATABASE" && renderDatabaseSettings()}
          {node.type === "TRANSFORM" && renderTransformSettings()}
          {node.type === "SCHEDULE" && renderScheduleSettings()}

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