"use client";

type ExecutionLogItem = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

type ExecutionLogsCardProps = {
  logs: ExecutionLogItem[];
  latestMessage: string;
};

function formatClientDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function ExecutionLogsCard({
  logs,
  latestMessage,
}: ExecutionLogsCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Recent logs</h3>
        <span className="text-xs text-white/45">Последние 3 записи</span>
      </div>

      <div className="space-y-2">
        {logs.length > 0 ? (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-white/10 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-cyan-300">[{log.level}]</span>
                <span className="text-xs text-white/35">
                  {formatClientDate(log.createdAt)}
                </span>
              </div>

              <p className="mt-2 text-sm text-white/70">
                {log.message.trim() !== "" ? log.message : "—"}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-white/45">
            Логи пока не записаны
          </div>
        )}
      </div>

      {latestMessage.trim() !== "" ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/45">
          Latest event: {latestMessage}
        </div>
      ) : null}
    </div>
  );
}