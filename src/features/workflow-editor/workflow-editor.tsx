"use client";

import { useCallback, useMemo, useState } from "react";
import {ArrowLeft, Loader2, Play, Save } from "lucide-react";
import type { Edge, Node } from "@xyflow/react";
import type { WorkflowWithGraph } from "@/shared/types/workflow-graph";
import { NodePalette, type PaletteItemData } from "./node-palette";
import { WorkflowCanvas } from "./workflow-canvas";
import { NodeSettingsPanel } from "./node-settings-panel";
import type { WorkflowExecutionResult } from "@/shared/types/workflow-execution";

import Link from "next/link"

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

type SelectedNode = {
  id: string;
  name: string;
  type: string;
  kind: "TRIGGER" | "ACTION";
  description: string | null;
  retryLimit: number;
  retryDelayMs: number;
  timeoutMs: number | null;
  isEnabled: boolean;
};

function mapWorkflowToCanvasNodes(workflow: WorkflowWithGraph): WorkflowCanvasNode[] {
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

function mapWorkflowToCanvasEdges(workflow: WorkflowWithGraph): WorkflowCanvasEdge[] {
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
      config: node.data.config ?? {},
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

export function WorkflowEditor({ workflow }: WorkflowEditorProps) {
  const [pendingNode, setPendingNode] = useState<PaletteItemData | null>(null);
  const [nodes, setNodes] = useState<WorkflowCanvasNode[]>(
    mapWorkflowToCanvasNodes(workflow)
  );
  const [edges, setEdges] = useState<WorkflowCanvasEdge[]>(
    mapWorkflowToCanvasEdges(workflow)
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunResultOpen, setIsRunResultOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunResult, setLastRunResult] =
  useState<WorkflowExecutionResult | null>(null);

  const handleAddNodeRequest = useCallback((item: PaletteItemData) => {
    setPendingNode(item);
  }, []);

  const handleNodeAdded = useCallback(() => {
    setPendingNode(null);
  }, []);

  const handleNodesChange = useCallback((nextNodes: WorkflowCanvasNode[]) => {
    setNodes(nextNodes);
  }, []);

  const handleEdgesChange = useCallback((nextEdges: WorkflowCanvasEdge[]) => {
    setEdges(nextEdges);
  }, []);

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
    };
  }, [nodes, selectedNodeId]);

  const handleNodeSettingsChange = useCallback(
    (nodeId: string, patch: Partial<SelectedNode>) => {
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
                },
              }
            : node
        )
      );
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
  }, []);

  const savePayload = useMemo(() => buildSavePayload(nodes, edges), [nodes, edges]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);

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
    } catch (error) {
      console.error(error);
      alert("Не удалось сохранить workflow");
    } finally {
      setIsSaving(false);
    }
  }, [savePayload, workflow.id]);

  const handleRun = useCallback(async () => {
    try {
      setIsRunning(true);
  
      const response = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
      });
  
      const result: {
        success: boolean;
        data?: WorkflowExecutionResult;
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
  
      if (!result.data) {
        throw new Error("Workflow run response does not contain execution data");
      }
  
      setLastRunResult(result.data);
      setIsRunResultOpen(true);
    } catch (error) {
      console.error(error);
  
      const message =
        error instanceof Error ? error.message : "Не удалось выполнить workflow";
  
      alert(message);
    } finally {
      setIsRunning(false);
    }
  }, [workflow.id]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#08101d] px-4 py-3 ">
  <div className="flex items-center gap-4">
    <Link
      href="/workflows"
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
    >
      <ArrowLeft className="h-5 w-5" />
    </Link>

    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
        Workflow Editor
      </p>
      <h1 className="text-lg font-semibold text-white">{workflow.name}</h1>
    </div>
  </div>

  <div className="flex items-center gap-3">
    <button
      type="button"
      onClick={handleRun}
      disabled={isRunning}
      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isRunning ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      Run workflow
    </button>
    {lastRunResult && !isRunResultOpen && (
  <button
    type="button"
    onClick={() => setIsRunResultOpen(true)}
    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/15"
  >
    Show last run
  </button>
)}
    <button
      type="button"
      onClick={handleSave}
      disabled={isSaving}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      Save workflow
    </button>
  </div>
</div>

<div className="flex h-full min-h-0">
  <NodePalette onAddNode={handleAddNodeRequest} />

  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
    <div className="min-h-0 flex-1">
      <WorkflowCanvas
        nodes={nodes}
        edges={edges}
        pendingNode={pendingNode}
        onNodeAdded={handleNodeAdded}
        onNodesChangeControlled={handleNodesChange}
        onEdgesChangeControlled={handleEdgesChange}
        onSelectNode={handleSelectNode}
        selectedNodeId={selectedNodeId}
      />
    </div>

    {lastRunResult && isRunResultOpen && (
  <div className="max-h-[320px] overflow-y-auto border-t border-white/10 bg-[#08101d] p-4">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
          Last run result
        </p>
        <h3 className="mt-1 text-lg font-semibold text-white">
          Status: {lastRunResult.status}
        </h3>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
          Duration: {lastRunResult.durationMs ?? 0} ms
        </div>

        <button
          type="button"
          onClick={() => setIsRunResultOpen(false)}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          Close
        </button>
      </div>
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-semibold text-white">Steps</h4>
        <div className="space-y-2">
          {lastRunResult.steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2"
            >
              <span className="text-sm text-white/75">{step.nodeName}</span>
              <span className="text-sm text-emerald-300">
                {step.status} · {step.durationMs ?? 0} ms
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h4 className="mb-3 text-sm font-semibold text-white">Logs</h4>
        <div className="space-y-2">
          {lastRunResult.logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75"
            >
              [{log.level}] {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
  </div>

  <NodeSettingsPanel
    node={selectedNode}
    onChange={handleNodeSettingsChange}
    onDelete={handleDeleteNode}
  />
</div>
      </div>
    
  );
}