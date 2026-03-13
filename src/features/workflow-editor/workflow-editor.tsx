"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Play,
  Plus,
  Save,
  Settings,
} from "lucide-react";
import type { Edge, Node } from "@xyflow/react";
import Link from "next/link";
import type { WorkflowWithGraph } from "@/shared/types/workflow-graph";
import type { WorkflowExecutionResult } from "@/shared/types/workflow-execution";
import { NodePalette, type PaletteItemData } from "./node-palette";
import { WorkflowCanvas } from "./workflow-canvas";
import { NodeSettingsPanel } from "./node-settings-panel";
import type { EditableNode } from "./node-settings-panel";

type WorkflowNodeData = {
  label: string;
  kind: "TRIGGER" | "ACTION";
  type: string;
  config: Record<string, unknown>;
  description: string | null;
  retryLimit: number;
  retryDelayMs: number;
  timeoutMs: number | null;
  isEnabled: boolean;
};

type WorkflowCanvasNode = Node<WorkflowNodeData>;
type WorkflowCanvasEdge = Edge;

interface WorkflowEditorProps {
  workflow: WorkflowWithGraph;
}

type SavePayload = {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    kind: "TRIGGER" | "ACTION";
    positionX: number;
    positionY: number;
    config: Record<string, unknown>;
    description: string | null;
    retryLimit: number;
    retryDelayMs: number;
    timeoutMs: number | null;
    isEnabled: boolean;
    sortOrder: number;
  }>;
  edges: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    label: string | null;
  }>;
  canvas: Record<string, unknown>;
};

type SelectedNode = EditableNode;

type LiveExecutionResult = WorkflowExecutionResult & {
  executionId?: string;
  triggerType?: string;
  updatedAt?: string;
};

const SUGGESTED_TAGS = [
  "sales",
  "webhook",
  "crm",
  "email",
  "schedule",
  "telegram",
  "database",
  "transform",
  "marketing",
  "internal",
];

function mapWorkflowToCanvasNodes(
  workflow: WorkflowWithGraph
): WorkflowCanvasNode[] {
  return workflow.nodes.map((node) => ({
    id: node.id,
    type: "workflowNode",
    position: {
      x: node.positionX,
      y: node.positionY,
    },
    data: {
      label: node.name,
      kind: node.kind,
      type: node.type,
      config:
        typeof node.config === "object" && node.config !== null
          ? (node.config as Record<string, unknown>)
          : {},
      description: node.description,
      retryLimit: node.retryLimit,
      retryDelayMs: node.retryDelayMs,
      timeoutMs: node.timeoutMs,
      isEnabled: node.isEnabled,
    },
    draggable: true,
    selectable: true,
  }));
}

function mapWorkflowToCanvasEdges(
  workflow: WorkflowWithGraph
): WorkflowCanvasEdge[] {
  return workflow.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    animated: true,
    label: edge.label ?? undefined,
  }));
}

function buildSavePayload(
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[]
): SavePayload {
  return {
    nodes: nodes.map((node, index) => ({
      id: node.id,
      name: node.data.label,
      type: node.data.type,
      kind: node.data.kind,
      positionX: node.position.x,
      positionY: node.position.y,
      config:
        node.data.type === "HTTP"
          ? {
              method:
                typeof node.data.config?.method === "string" &&
                node.data.config.method.trim().length > 0
                  ? node.data.config.method
                  : "POST",
              ...(node.data.config ?? {}),
            }
          : node.data.type === "WEBHOOK"
            ? {
                httpStarterOnly: node.data.config?.httpStarterOnly === true,
                ...(node.data.config ?? {}),
              }
            : node.data.config ?? {},
      description: node.data.description ?? null,
      retryLimit: node.data.retryLimit ?? 0,
      retryDelayMs: node.data.retryDelayMs ?? 0,
      timeoutMs: node.data.timeoutMs ?? null,
      isEnabled: node.data.isEnabled ?? true,
      sortOrder: index,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      label: typeof edge.label === "string" ? edge.label : null,
    })),
    canvas: {
      updatedAt: new Date().toISOString(),
    },
  };
}

function mapSavedNodeEnabled(
  nodes: WorkflowCanvasNode[]
): Record<string, boolean> {
  return Object.fromEntries(nodes.map((node) => [node.id, node.data.isEnabled]));
}

function getStepStatusTone(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "text-emerald-300";
    case "RUNNING":
      return "text-cyan-300";
    case "RETRYING":
      return "text-amber-300";
    case "FAILED":
      return "text-rose-300";
    default:
      return "text-white/60";
  }
}

function getRunStatusTone(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "text-emerald-300";
    case "RUNNING":
      return "text-cyan-300";
    case "RETRYING":
      return "text-amber-300";
    case "FAILED":
      return "text-rose-300";
    default:
      return "text-white";
  }
}

function getRelativeUpdatedLabel(updatedAt?: string, nowMs?: number): string {
  if (!updatedAt) {
    return "Updated recently";
  }

  const updatedTime = new Date(updatedAt).getTime();

  if (Number.isNaN(updatedTime)) {
    return "Updated recently";
  }

  const diffMs = (nowMs ?? Date.now()) - updatedTime;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 5) {
    return "Updated just now";
  }

  if (diffSec < 60) {
    return `Updated ${diffSec} sec ago`;
  }

  const diffMin = Math.floor(diffSec / 60);

  if (diffMin < 60) {
    return `Updated ${diffMin} min ago`;
  }

  return `Updated at ${new Date(updatedAt).toLocaleTimeString()}`;
}

export function WorkflowEditor({ workflow }: WorkflowEditorProps) {
  const [liveRunsHeight, setLiveRunsHeight] = useState(220);
  const isResizingLiveRunsRef = useRef(false);
  const liveRunsStartYRef = useRef(0);
  const liveRunsStartHeightRef = useRef(220);

  const [pendingNode, setPendingNode] = useState<PaletteItemData | null>(null);
  const [nodes, setNodes] = useState<WorkflowCanvasNode[]>(
    mapWorkflowToCanvasNodes(workflow)
  );
  const [edges, setEdges] = useState<WorkflowCanvasEdge[]>(
    mapWorkflowToCanvasEdges(workflow)
  );
  const [savedNodeEnabledById, setSavedNodeEnabledById] = useState<
    Record<string, boolean>
  >(() => mapSavedNodeEnabled(mapWorkflowToCanvasNodes(workflow)));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunResultOpen, setIsRunResultOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [liveExecutions, setLiveExecutions] = useState<LiveExecutionResult[]>(
    []
  );
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  const [workflowName, setWorkflowName] = useState(workflow.name);
  const [workflowDescription, setWorkflowDescription] = useState(
    workflow.description ?? ""
  );
  const [workflowTags, setWorkflowTags] = useState<string[]>(
    Array.isArray(workflow.tags) ? workflow.tags : []
  );
  const [tagInput, setTagInput] = useState("");
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isGraphDirty, setIsGraphDirty] = useState(false);

  const pollingRef = useRef<number | null>(null);
  const clockRef = useRef<number | null>(null);

  const handleLiveRunsResizeStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      isResizingLiveRunsRef.current = true;
      liveRunsStartYRef.current = event.clientY;
      liveRunsStartHeightRef.current = liveRunsHeight;
      event.preventDefault();
    },
    [liveRunsHeight]
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingLiveRunsRef.current) {
        return;
      }

      const delta = liveRunsStartYRef.current - event.clientY;
      const nextHeight = liveRunsStartHeightRef.current + delta;

      setLiveRunsHeight(Math.max(170, Math.min(460, nextHeight)));
    };

    const handleMouseUp = () => {
      isResizingLiveRunsRef.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const hasSavedActiveSchedule = useMemo(
    () =>
      nodes.some((node) => {
        if (node.data.type !== "SCHEDULE") {
          return false;
        }

        const savedEnabled = savedNodeEnabledById[node.id] ?? node.data.isEnabled;
        const savedCron =
          typeof node.data.config?.cron === "string"
            ? node.data.config.cron.trim()
            : "";

        return savedEnabled === true && savedCron.length > 0;
      }),
    [nodes, savedNodeEnabledById]
  );

  const stopExecutionPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchLiveExecutions = useCallback(async () => {
    const response = await fetch(`/api/workflows/${workflow.id}/executions-live`, {
      method: "GET",
      cache: "no-store",
    });

    const result: {
      success: boolean;
      data?: LiveExecutionResult[];
      message?: string;
    } = await response.json();

    if (!response.ok || !result.success || !result.data) {
      return;
    }

    setLiveExecutions(result.data);

    const hasActiveExecution = result.data.some(
      (execution) =>
        execution.status === "RUNNING" || execution.status === "RETRYING"
    );

    if (!hasActiveExecution) {
      setIsRunning(false);

      if (!isRunResultOpen) {
        stopExecutionPolling();
      }
    }
  }, [isRunResultOpen, stopExecutionPolling, workflow.id]);

  const startExecutionPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      return;
    }

    void fetchLiveExecutions();

    pollingRef.current = window.setInterval(() => {
      void fetchLiveExecutions();
    }, 1000);
  }, [fetchLiveExecutions]);

  useEffect(() => {
    clockRef.current = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      if (clockRef.current !== null) {
        window.clearInterval(clockRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      stopExecutionPolling();
    };
  }, [stopExecutionPolling]);

  const handleAddNodeRequest = useCallback((item: PaletteItemData) => {
    setPendingNode(item);
  }, []);

  const handleNodeAdded = useCallback(() => {
    setPendingNode(null);
  }, []);

  const handleNodesChange = useCallback(
    (nextNodes: WorkflowCanvasNode[]) => {
      const currentSnapshot = JSON.stringify(buildSavePayload(nodes, edges));
      const nextSnapshot = JSON.stringify(buildSavePayload(nextNodes, edges));
  
      setNodes(nextNodes);
  
      if (currentSnapshot !== nextSnapshot) {
        setIsGraphDirty(true);
      }
    },
    [nodes, edges]
  );

  const handleEdgesChange = useCallback(
    (nextEdges: WorkflowCanvasEdge[]) => {
      const currentSnapshot = JSON.stringify(buildSavePayload(nodes, edges));
      const nextSnapshot = JSON.stringify(buildSavePayload(nodes, nextEdges));
  
      setEdges(nextEdges);
  
      if (currentSnapshot !== nextSnapshot) {
        setIsGraphDirty(true);
      }
    },
    [nodes, edges]
  );

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const selectedNode = useMemo<SelectedNode | null>(() => {
    if (!selectedNodeId) return null;

    const node = nodes.find((item) => item.id === selectedNodeId);
    if (!node) return null;

    return {
      id: node.id,
      name: node.data.label,
      type: node.data.type,
      kind: node.data.kind,
      description: node.data.description ?? null,
      retryLimit: node.data.retryLimit ?? 0,
      retryDelayMs: node.data.retryDelayMs ?? 0,
      timeoutMs: node.data.timeoutMs ?? null,
      isEnabled: node.data.isEnabled ?? true,
      config: node.data.config ?? {},
    };
  }, [nodes, selectedNodeId]);

  const handleNodeSettingsChange = useCallback(
    (
      nodeId: string,
      patch: Partial<SelectedNode> & { config?: Record<string, unknown> | null }
    ) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...(patch.name !== undefined ? { label: patch.name } : {}),
                  ...(patch.description !== undefined
                    ? { description: patch.description }
                    : {}),
                  ...(patch.retryLimit !== undefined
                    ? { retryLimit: patch.retryLimit }
                    : {}),
                  ...(patch.retryDelayMs !== undefined
                    ? { retryDelayMs: patch.retryDelayMs }
                    : {}),
                  ...(patch.timeoutMs !== undefined
                    ? { timeoutMs: patch.timeoutMs }
                    : {}),
                  ...(patch.isEnabled !== undefined
                    ? { isEnabled: patch.isEnabled }
                    : {}),
                  ...(patch.config !== undefined
                    ? { config: patch.config ?? {} }
                    : {}),
                },
              }
            : node
        )
      );
  
      setIsGraphDirty(true);
    },
    []
  );

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      )
    );
    setSelectedNodeId((currentId) => (currentId === nodeId ? null : currentId));
    setIsGraphDirty(true);
  }, []);

  const addTag = useCallback((rawTag: string) => {
    const normalized = rawTag.trim().replace(/^#/, "").toLowerCase();

    if (!normalized) {
      return;
    }

    setWorkflowTags((prev) =>
      prev.includes(normalized) ? prev : [...prev, normalized]
    );
    setTagInput("");
  }, []);

  const removeTag = useCallback((tagToRemove: string) => {
    setWorkflowTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }, []);

  const handleTagKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addTag(tagInput);
      }
    },
    [addTag, tagInput]
  );

  const saveWorkflowMeta = useCallback(async () => {
    setIsSavingMeta(true);

    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workflowName.trim(),
          description: workflowDescription.trim(),
          tags: workflowTags,
        }),
      });

      if (!response.ok) {
        throw new Error("Не удалось сохранить метаданные workflow");
      }
    } finally {
      setIsSavingMeta(false);
    }
  }, [workflow.id, workflowDescription, workflowName, workflowTags]);

  const savePayload = useMemo(() => buildSavePayload(nodes, edges), [nodes, edges]);



  const latestExecution = liveExecutions[0] ?? null;

  const runtimeStatusByNodeName = useMemo(() => {
    const entries =
      latestExecution?.steps?.map((step) => [step.nodeName, step.status] as const) ??
      [];

    return Object.fromEntries(entries);
  }, [latestExecution]);

  const hasUnsavedWorkflowChanges = isGraphDirty;

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

      await saveWorkflowMeta();

      const response = await fetch(`/api/workflows/${workflow.id}/graph`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(savePayload),
      });

      if (!response.ok) {
        throw new Error("Failed to save workflow graph");
      }

      setSavedNodeEnabledById(mapSavedNodeEnabled(nodes));
      setIsGraphDirty(false);
    } catch (error) {
      console.error(error);
      alert("Не удалось сохранить workflow");
    } finally {
      setIsSaving(false);
    }
  }, [nodes, savePayload, saveWorkflowMeta, workflow.id]);

  const handleRun = useCallback(async () => {
    try {
      setIsRunning(true);

      await saveWorkflowMeta();

      const saveResponse = await fetch(`/api/workflows/${workflow.id}/graph`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(savePayload),
      });

      const saveResult: {
        success?: boolean;
        message?: string;
        details?: unknown;
      } = await saveResponse.json();

      if (!saveResponse.ok || saveResult.success === false) {
        const detailsMessage =
          saveResult.details &&
          typeof saveResult.details === "object" &&
          "error" in saveResult.details &&
          typeof (saveResult.details as { error?: unknown }).error === "string"
            ? (saveResult.details as { error: string }).error
            : null;

        throw new Error(
          detailsMessage ||
            saveResult.message ||
            "Failed to save workflow before run"
        );
      }

      setSavedNodeEnabledById(mapSavedNodeEnabled(nodes));
      setIsGraphDirty(true);

      const response = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
      });

      const result: {
        success: boolean;
        data?: LiveExecutionResult;
        message?: string;
        details?: unknown;
      } = await response.json();

      if (!response.ok || !result.success) {
        const detailsMessage =
          result.details &&
          typeof result.details === "object" &&
          "error" in result.details &&
          typeof (result.details as { error?: unknown }).error === "string"
            ? (result.details as { error: string }).error
            : null;

        throw new Error(
          detailsMessage || result.message || "Failed to run workflow"
        );
      }

      setIsRunResultOpen(true);
      startExecutionPolling();
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error ? error.message : "Не удалось выполнить workflow";

      alert(message);
      setIsRunning(false);
    }
  }, [nodes, savePayload, saveWorkflowMeta, startExecutionPolling, workflow.id]);

  useEffect(() => {
    const shouldPoll = isRunResultOpen || isRunning;

    if (shouldPoll) {
      startExecutionPolling();
    } else {
      stopExecutionPolling();
    }

    return () => {
      stopExecutionPolling();
    };
  }, [isRunResultOpen, isRunning, startExecutionPolling, stopExecutionPolling]);

  useEffect(() => {
    if (liveExecutions.length > 0 && isRunning) {
      setIsRunResultOpen(true);
    }
  }, [liveExecutions, isRunning]);

  const showScheduleWarning = hasSavedActiveSchedule;

  return (
    <>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#07111f]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#08101d] px-3 py-2.5">
          <div className="flex items-center gap-3">
            <Link
              href="/workflows"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                Workflow Editor
              </p>
              <h1 className="text-lg font-semibold text-white">
                {workflowName || "Workflow editor"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedWorkflowChanges ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-300" />
                Unsaved changes
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2 text-[13px] font-medium text-emerald-200 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run workflow
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRunResultOpen(true);
                void fetchLiveExecutions();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-2 text-[13px] font-medium text-cyan-200 transition hover:bg-cyan-400/15"
            >
              Show live runs
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isSavingMeta}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save workflow
            </button>

            <button
              type="button"
              onClick={() => setIsMetaModalOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/75 transition hover:bg-white/15 hover:text-white"
              aria-label="Открыть настройки workflow"
              title="Настройки workflow"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showScheduleWarning ? (
          <div className="shrink-0 border-b border-amber-400/10 bg-amber-400/5 px-4 py-3">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <div className="text-sm font-medium">Schedule is active</div>
                <div className="mt-1 text-xs text-amber-100/80">
                  Workflow can continue running in real time. Pause schedule before switching tabs if you do not want background executions.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <NodePalette onAddNode={handleAddNodeRequest} />

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                pendingNode={pendingNode}
                onNodeAdded={handleNodeAdded}
                onNodesChangeControlled={handleNodesChange}
                onEdgesChangeControlled={handleEdgesChange}
                onSelectNode={handleSelectNode}
                selectedNodeId={selectedNodeId}
                savedNodeEnabledById={savedNodeEnabledById}
                runtimeStatusByNodeName={runtimeStatusByNodeName}
                showScheduleActiveIndicator={hasSavedActiveSchedule}
              />
            </div>

            {liveExecutions.length > 0 && isRunResultOpen ? (
              <div className="pointer-events-none shrink-0 px-3 pb-3">
                <div
                  className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 border-b-0 bg-[#08101d]/96 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur"
                  style={{ height: `${liveRunsHeight}px` }}
                >
                  <div className="relative shrink-0 pt-2">
                    <div
                      onMouseDown={handleLiveRunsResizeStart}
                      className="group flex h-5 cursor-row-resize items-center justify-center"
                      title="Resize live runs panel"
                    >
                      <div className="h-1.5 w-16 rounded-full bg-white/12 transition group-hover:bg-cyan-400/40" />
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 pb-3 pt-0.5">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">
                        Live runs history
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-white">
                        {latestExecution ? (
                          <>
                            Current status:{" "}
                            <span
                              className={getRunStatusTone(
                                latestExecution.status
                              )}
                            >
                              {latestExecution.status}
                            </span>
                          </>
                        ) : (
                          "No active runs"
                        )}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsRunResultOpen(false)}
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                    <div className="space-y-3">
                      {liveExecutions.map((execution) => {
                        const executionMeta = (
                          <div className="mb-2">
                            <div
                              className={`flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] p-2 transition ${
                                execution.executionId
                                  ? "cursor-pointer hover:border-cyan-400/30 hover:bg-cyan-400/10"
                                  : ""
                              }`}
                            >
                              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/75">
                                Execution: {execution.executionId ?? "unknown"}
                              </div>

                              {execution.triggerType ? (
                                <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/75">
                                  Trigger: {execution.triggerType}
                                </div>
                              ) : null}

                              <div
                                className={`rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] ${getRunStatusTone(
                                  execution.status
                                )}`}
                              >
                                Status: {execution.status}
                              </div>

                              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/75">
                                {getRelativeUpdatedLabel(execution.updatedAt, nowMs)}
                              </div>

                              <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/75">
                                Duration: {execution.durationMs ?? 0} ms
                              </div>

                              {execution.executionId ? (
                                <div className="ml-auto inline-flex items-center rounded-full border border-cyan-400/15 bg-cyan-400/8 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300 transition">
                                  Details ↗
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );

                        return (
                          <div
                            key={
                              execution.executionId ??
                              `${execution.triggerType}-${execution.updatedAt}`
                            }
                            className="rounded-2xl border border-white/10 bg-white/5 p-2.5"
                          >
                            {execution.executionId ? (
                              <Link
                                href={`/executions/${execution.executionId}`}
                                className="block"
                              >
                                {executionMeta}
                              </Link>
                            ) : (
                              executionMeta
                            )}

                            <div className="grid gap-2 xl:grid-cols-2">
                              <div className="rounded-2xl border border-white/10 bg-[#0b1728]/60 p-2.5">
                                <h4 className="mb-2 text-[13px] font-semibold text-white">
                                  Steps
                                </h4>
                                <div className="space-y-1.5">
                                  {(execution.steps ?? []).map((step) => (
                                    <div
                                      key={step.id}
                                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-2.5 py-2"
                                    >
                                      <span className="text-[13px] text-white/75">
                                        {step.nodeName}
                                      </span>
                                      <span
                                        className={`text-[13px] ${getStepStatusTone(
                                          step.status
                                        )}`}
                                      >
                                        {step.status} · {step.durationMs ?? 0} ms
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-[#0b1728]/60 p-2.5">
                                <h4 className="mb-2 text-[13px] font-semibold text-white">
                                  Logs
                                </h4>
                                <div className="space-y-1.5">
                                  {(execution.logs ?? []).map((log) => (
                                    <div
                                      key={log.id}
                                      className="rounded-xl border border-white/10 px-2.5 py-2 text-[13px] text-white/75"
                                    >
                                      [{log.level}] {log.message}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <NodeSettingsPanel
            node={selectedNode}
            onChange={handleNodeSettingsChange}
            onDelete={handleDeleteNode}
          />
        </div>
      </div>

      {isMetaModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#08101d] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Workflow settings
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Настройки workflow
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsMetaModalOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Закрыть
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
                  Название workflow
                </label>
                <input
                  value={workflowName}
                  onChange={(event) => setWorkflowName(event.target.value)}
                  placeholder="Название workflow"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
                  Описание
                </label>
                <textarea
                  value={workflowDescription}
                  onChange={(event) => setWorkflowDescription(event.target.value)}
                  placeholder="Коротко опиши, что делает workflow"
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
                  Хештеги
                </label>

                <div className="mb-3 flex flex-wrap gap-2">
                  {workflowTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-400/15"
                    >
                      #{tag} ×
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Введи тег"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                  />
                  <button
                    type="button"
                    onClick={() => addTag(tagInput)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTED_TAGS.map((tag) => {
                    const isSelected = workflowTags.includes(tag);

                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        disabled={isSelected}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsMetaModalOpen(false)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={async () => {
                  await saveWorkflowMeta();
                  setIsMetaModalOpen(false);
                }}
                disabled={isSavingMeta || workflowName.trim().length < 2}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingMeta ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}