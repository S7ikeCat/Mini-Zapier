import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { WorkflowEditor } from "@/features/workflow-editor/workflow-editor";

type WorkflowEditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkflowEditorPage({
  params,
}: WorkflowEditorPageProps) {
  await connection();

  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      nodes: true,
      edges: true,
    },
  });

  if (!workflow) {
    notFound();
  }

  return <WorkflowEditor workflow={workflow} />;
}