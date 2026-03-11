import { WorkflowSchedulerService } from "@/server/services/workflow-scheduler.service";

const TICK_MS = 60_000;

let isTicking = false;

async function runTick(): Promise<void> {
  if (isTicking) {
    return;
  }

  isTicking = true;

  try {
    await WorkflowSchedulerService.tick({
      lookbackMs: 60_000,
    });
  } catch (error) {
    console.error("Scheduler tick failed", error);
  } finally {
    isTicking = false;
  }
}

async function main(): Promise<void> {
  console.log(`Workflow scheduler started. Tick interval: ${TICK_MS}ms`);

  await runTick();

  setInterval(() => {
    void runTick();
  }, TICK_MS);
}

void main();