"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
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

function hasActiveSavedSchedule(
  node: WorkflowCanvasNode,
  savedNodeEnabledById: Record<string, boolean>
): boolean {
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

  const { setViewport, getNodes } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

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
        config:
          pendingNode.type === "HTTP"
            ? { method: "POST" }
            : pendingNode.type === "WEBHOOK"
              ? { httpStarterOnly: false }
              : {},
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
    [
      nodes,
      selectedNodeId,
      savedNodeEnabledById,
      runtimeStatusByNodeName,
      showScheduleActiveIndicator,
    ]
  );

  useEffect(() => {
    if (!nodesInitialized) {
      return;
    }

    const flowNodes = getNodes();

    if (!flowNodes.length) {
      return;
    }

    const bounds = getNodesBounds(flowNodes);

    const viewport = getViewportForBounds(
      bounds,
      window.innerWidth - 560,
      window.innerHeight - 220,
      0.2,
      1.4,
      0.28
    );

    setViewport(
      {
        x: viewport.x - 40,
        y: viewport.y - 10,
        zoom: viewport.zoom,
      },
      { duration: 0 }
    );
  }, [nodesInitialized, getNodes, setViewport, renderedNodes.length]);

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
        minZoom={0.2}
        maxZoom={1.4}
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
          nodeBorderRadius={10}
          nodeStrokeWidth={0.4}
          maskColor="rgba(7, 17, 31, 0.78)"
          bgColor="rgba(8, 16, 29, 0.94)"
          className="h-26! w-39! rounded-[22px]! border! border-white/10! bg-[#08101d]/95! shadow-[0_8px_24px_rgba(0,0,0,0.25)]!"
          nodeColor={(node) => {
            const type = String(node.data?.type ?? "");

            if (type === "WEBHOOK") return "rgba(34, 211, 238, 0.45)";
            if (type === "HTTP") return "rgba(16, 185, 129, 0.45)";
            if (type === "TELEGRAM") return "rgba(148, 163, 184, 0.45)";
            if (type === "SCHEDULE") return "rgba(168, 85, 247, 0.45)";

            return "rgba(255,255,255,0.25)";
          }}
        />

        <Controls
          position="bottom-left"
          className="shadow-none!"
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