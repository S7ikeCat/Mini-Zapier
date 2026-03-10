export async function sleep(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }
  
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  
  export async function withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number | null | undefined,
    message: string
  ): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) {
      return operation;
    }
  
    return await Promise.race<T>([
      operation,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  }