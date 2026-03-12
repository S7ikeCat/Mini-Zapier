"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";

export function NewWorkflowForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 3;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
          status: "DRAFT",
          isEnabled: false,
          tags: [],
        }),
      });

      const result: {
        success: boolean;
        data?: { id: string };
        message?: string;
      } = await response.json();

      if (!response.ok || !result.success || !result.data?.id) {
        throw new Error(result.message || "Не удалось создать workflow");
      }

      router.push(`/workflows/${result.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось создать workflow"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/workflows"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
            Workflow creation
          </p>
          <h1 className="text-2xl font-semibold text-white">Новый workflow</h1>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-linear-to-br from-cyan-500/10 via-white/5 to-violet-500/10 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
              Название
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например: Lead Capture Pipeline"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              autoFocus
            />
            <p className="mt-2 text-xs text-white/45">
              Минимум 3 символа.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Коротко опиши, что делает workflow"
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Создать workflow
            </button>

            <Link
              href="/workflows"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}