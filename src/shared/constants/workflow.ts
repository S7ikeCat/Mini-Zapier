export const TRIGGER_TYPES = [
    {
      value: "WEBHOOK",
      label: "Webhook",
      description: "Запуск workflow по входящему HTTP webhook",
    },
    {
      value: "SCHEDULE",
      label: "Schedule",
      description: "Запуск по расписанию cron",
    },
    {
      value: "EMAIL",
      label: "Email",
      description: "Запуск по входящему email событию",
    },
  ] as const;
  
  export const ACTION_TYPES = [
    {
      value: "HTTP",
      label: "HTTP Request",
      description: "Отправка внешнего HTTP запроса",
    },
    {
      value: "EMAIL",
      label: "Email",
      description: "Отправка email уведомления",
    },
    {
      value: "TELEGRAM",
      label: "Telegram",
      description: "Отправка сообщения в Telegram",
    },
    {
      value: "DATABASE",
      label: "Database",
      description: "Операция с базой данных",
    },
    {
      value: "TRANSFORM",
      label: "Transform",
      description: "Преобразование данных между шагами",
    },
  ] as const;