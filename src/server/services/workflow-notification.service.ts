type WorkflowFailureNotificationInput = {
    workflowId: string;
    workflowName: string;
    executionId: string;
    errorMessage: string;
    source: string;
  };
  
  export class WorkflowNotificationService {
    static async notifyFailure(
      input: WorkflowFailureNotificationInput
    ): Promise<void> {
      await Promise.allSettled([
        this.sendTelegramFailureNotification(input),
        this.sendEmailFailureNotification(input),
      ]);
    }
  
    private static async sendTelegramFailureNotification(
      input: WorkflowFailureNotificationInput
    ): Promise<void> {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_DEFAULT_CHAT_ID;
  
      if (!token || !chatId) {
        return;
      }
  
      const text = [
        "Workflow FAILED",
        `Workflow: ${input.workflowName}`,
        `Workflow ID: ${input.workflowId}`,
        `Execution ID: ${input.executionId}`,
        `Source: ${input.source}`,
        `Error: ${input.errorMessage}`,
      ].join("\n");
  
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: chatId,
            text,
          }),
        }
      );
  
      if (!response.ok) {
        throw new Error("Failed to send Telegram failure notification");
      }
    }
  
    private static async sendEmailFailureNotification(
      _input: WorkflowFailureNotificationInput
    ): Promise<void> {
      return;
    }
  }