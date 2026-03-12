"use client";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";

import { WorkflowNode } from "./workflow-node";
import type { PaletteItemData } from "./node-palette";

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
  savedIsEnabled?: boolean;
  runtimeStatus?: string | null;
  showScheduleActive?: boolean;
};

type WorkflowCanvasNode = Node<WorkflowNodeData>;
type WorkflowCanvasEdge = Edge;

interface WorkflowCanvasProps {
  nodes: WorkflowCanvasNode[];
  edges: WorkflowCanvasEdge[];
  pendingNode: PaletteItemData | null;
  onNodeAdded: () => void;
  onNodesChangeControlled: (nodes: WorkflowCanvasNode[]) => void;
  onEdgesChangeControlled: (edges: WorkflowCanvasEdge[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  savedNodeEnabledById: Record<string, boolean>;
  runtimeStatusByNodeName: Record<string, string>;
  showScheduleActiveIndicator: boolean;
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
};

function hasActiveSavedSchedule(node: WorkflowCanvasNode, savedNodeEnabledById: Record<string, boolean>): boolean {
  if (node.data.type !== "SCHEDULE") {
    return false;
  }

  const savedEnabled = savedNodeEnabledById[node.id] ?? node.data.isEnabled;
  const cron =
    typeof node.data.config?.cron === "string"
      ? node.data.config.cron.trim()
      : "";

  return savedEnabled === true && cron.length > 0;
}

function WorkflowCanvasInner({
  nodes,
  edges,
  pendingNode,
  onNodeAdded,
  onNodesChangeControlled,
  onEdgesChangeControlled,
  onSelectNode,
  selectedNodeId,
  savedNodeEnabledById,
  runtimeStatusByNodeName,
  showScheduleActiveIndicator,
}: WorkflowCanvasProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange<WorkflowCanvasNode>[]) => {
      const nextNodes = applyNodeChanges(changes, nodes);
      onNodesChangeControlled(nextNodes);
    },
    [nodes, onNodesChangeControlled]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowCanvasEdge>[]) => {
      const nextEdges = applyEdgeChanges(changes, edges);
      onEdgesChangeControlled(nextEdges);
    },
    [edges, onEdgesChangeControlled]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const nextEdges = addEdge(
        {
          ...params,
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `edge_${Date.now()}`,
          animated: true,
        },
        edges
      );

      onEdgesChangeControlled(nextEdges);
    },
    [edges, onEdgesChangeControlled]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: WorkflowCanvasNode) => {
      setSelectedEdgeId(null);
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: WorkflowCanvasEdge) => {
      onSelectNode(null);
      setSelectedEdgeId(edge.id);
    },
    [onSelectNode]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
    setSelectedEdgeId(null);
  }, [onSelectNode]);

  useEffect(() => {
    if (!pendingNode) return;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `node_${Date.now()}`;

    const newNode: WorkflowCanvasNode = {
      id,
      type: "workflowNode",
      position: {
        x: 250 + Math.random() * 120,
        y: 160 + Math.random() * 120,
      },
      data: {
        label: pendingNode.label,
        kind: pendingNode.kind,
        type: pendingNode.type,
        config: {},
        description: null,
        retryLimit: 0,
        retryDelayMs: 0,
        timeoutMs: null,
        isEnabled: true,
        savedIsEnabled: true,
        runtimeStatus: null,
        showScheduleActive: false,
      },
      draggable: true,
      selectable: true,
    };

    onNodesChangeControlled([...nodes, newNode]);
    onNodeAdded();
  }, [pendingNode, nodes, onNodeAdded, onNodesChangeControlled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (
        tagName === "input" ||
        tagName === "textarea" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      if (selectedEdgeId) {
        onEdgesChangeControlled(edges.filter((edge) => edge.id !== selectedEdgeId));
        setSelectedEdgeId(null);
        return;
      }

      if (selectedNodeId) {
        onNodesChangeControlled(nodes.filter((node) => node.id !== selectedNodeId));
        onEdgesChangeControlled(
          edges.filter(
            (edge) =>
              edge.source !== selectedNodeId && edge.target !== selectedNodeId
          )
        );
        onSelectNode(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    edges,
    nodes,
    onEdgesChangeControlled,
    onNodesChangeControlled,
    onSelectNode,
    selectedEdgeId,
    selectedNodeId,
  ]);

  const renderedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: selectedNodeId === node.id,
        data: {
          ...node.data,
          savedIsEnabled: savedNodeEnabledById[node.id] ?? node.data.isEnabled,
          runtimeStatus: runtimeStatusByNodeName[node.data.label] ?? null,
          showScheduleActive:
  hasActiveSavedSchedule(node, savedNodeEnabledById) &&
  showScheduleActiveIndicator,
        },
      })),
    [nodes, selectedNodeId, savedNodeEnabledById, runtimeStatusByNodeName, showScheduleActiveIndicator]
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#07111f]">
      {showScheduleActiveIndicator ? (
        <div className="pointer-events-none absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200 shadow-[0_12px_30px_rgba(16,185,129,0.12)]">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
          Schedule active!
        </div>
      ) : null}

      <ReactFlow
        nodes={renderedNodes}
        edges={edges.map((edge) => ({
          ...edge,
          selected: selectedEdgeId === edge.id,
        }))}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable
        nodesConnectable
        elementsSelectable
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          nodeStrokeWidth={3}
          className="!h-[110px] !w-[160px] !rounded-xl !border !border-white/10 !bg-[#0b1728]/95 !shadow-none"
          maskColor="rgba(7, 17, 31, 0.72)"
        />
        <Controls
          position="bottom-left"
          className="!shadow-none"
          showInteractive={false}
        />
        <Background gap={20} size={1.15} color="rgba(56, 189, 248, 0.14)" />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}