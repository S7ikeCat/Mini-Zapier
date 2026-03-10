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
import { useCallback, useEffect, useState } from "react";
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
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
};

function WorkflowCanvasInner({
  nodes,
  edges,
  pendingNode,
  onNodeAdded,
  onNodesChangeControlled,
  onEdgesChangeControlled,
  onSelectNode,
  selectedNodeId,
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

  return (
    <div className="h-full w-full overflow-hidden bg-[#07111f]">
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          selected: selectedNodeId === node.id,
        }))}
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