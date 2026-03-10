import { prisma } from "@/shared/lib/prisma";
import { WorkflowEditor } from "@/features/workflow-editor/workflow-editor";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      nodes: true,
      edges: true,
    },
  });

  if (!workflow) {
    return <div className="text-white p-8">Workflow not found</div>;
  }

  return <WorkflowEditor workflow={workflow} />;
}