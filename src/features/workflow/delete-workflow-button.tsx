"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { MouseEvent, useState } from "react";

type Props = {
  workflowId: string;
  workflowName: string;
  className?: string;
};

export function DeleteWorkflowButton({
  workflowId,
  workflowName,
  className,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const confirmDelete = window.confirm(
      `Удалить workflow "${workflowName}"?\n\nВсе executions, nodes, logs и связанные данные будут удалены.`
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete workflow");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      window.alert("Не удалось удалить workflow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className={`${className ?? ""} cursor-pointer disabled:cursor-not-allowed`}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}