-- DropForeignKey
ALTER TABLE "ExecutionStep" DROP CONSTRAINT "ExecutionStep_nodeId_fkey";

-- AlterTable
ALTER TABLE "ExecutionStep" ALTER COLUMN "nodeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ExecutionStep" ADD CONSTRAINT "ExecutionStep_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "WorkflowNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
