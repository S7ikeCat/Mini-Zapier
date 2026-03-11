-- CreateIndex
CREATE INDEX "Execution_status_createdAt_idx" ON "Execution"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Execution_triggerType_createdAt_idx" ON "Execution"("triggerType", "createdAt");

-- CreateIndex
CREATE INDEX "Execution_workflowId_createdAt_idx" ON "Execution"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "Execution_workflowId_status_createdAt_idx" ON "Execution"("workflowId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionLog_executionId_createdAt_idx" ON "ExecutionLog"("executionId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionLog_executionId_level_idx" ON "ExecutionLog"("executionId", "level");

-- CreateIndex
CREATE INDEX "ExecutionStep_executionId_createdAt_idx" ON "ExecutionStep"("executionId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionStep_executionId_status_idx" ON "ExecutionStep"("executionId", "status");
