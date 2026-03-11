import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";

export default async function NewWorkflowPage() {
  const workflow = await prisma.workflow.create({
    data: {
      name: "New workflow",
      status: "DRAFT",
    },
  });

  redirect(`/workflows/${workflow.id}`);
}