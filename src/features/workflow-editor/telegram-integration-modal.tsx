"use client";

import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";

type TelegramIntegrationData = {
  connected: boolean;
  botTokenMasked: string | null;
  defaultChatId: string | null;
  botUsername: string | null;
  isActive: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function TelegramIntegrationModal({ isOpen, onClose }: Props) {
  const [botToken, setBotToken] = useState("");
  const [defaultChatId, setDefaultChatId] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [savedData, setSavedData] = useState<TelegramIntegrationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const load = async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/integrations/telegram", {
          method: "GET",
          cache: "no-store",
        });

        const result: {
          success: boolean;
          data?: TelegramIntegrationData;
        } = await response.json();

        if (response.ok && result.success && result.data) {
          setSavedData(result.data);
          setDefaultChatId(result.data.defaultChatId ?? "");
          setBotUsername(result.data.botUsername ?? "");
          setIsActive(result.data.isActive);
          setBotToken("");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#08101d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Telegram integration
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Подключение Telegram
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Закрыть
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка интеграции...
            </div>
          ) : null}

          {savedData?.connected ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              Подключено. Текущий токен: {savedData.botTokenMasked}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              Telegram ещё не подключён.
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
              Bot token
            </label>

            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(event) => setBotToken(event.target.value)}
                placeholder={
                  savedData?.connected
                    ? "Оставь пустым, если не меняешь токен"
                    : "Вставь Telegram bot token"
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              />

              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
              Default chat ID
            </label>
            <input
              value={defaultChatId}
              onChange={(event) => setDefaultChatId(event.target.value)}
              placeholder="Например: 816249570"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
              Bot username
            </label>
            <input
              value={botUsername}
              onChange={(event) => setBotUsername(event.target.value)}
              placeholder="Например: MiZapierbot"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Использовать эту Telegram-интеграцию
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={async () => {
              setIsSaving(true);

              try {
                const response = await fetch("/api/integrations/telegram", {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    botToken:
                      botToken.trim() || undefined,
                    defaultChatId: defaultChatId.trim() || null,
                    botUsername: botUsername.trim() || null,
                    isActive,
                  }),
                });

                if (!response.ok) {
                  throw new Error("Не удалось сохранить Telegram интеграцию");
                }

                onClose();
              } finally {
                setIsSaving(false);
              }
            }}
            disabled={isSaving || (!savedData?.connected && botToken.trim().length === 0)}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}