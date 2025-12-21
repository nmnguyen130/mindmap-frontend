import type { MindMapNode, MindmapData } from "../types";

interface TreeNode {
  id: string;
  children: string[];
  parent?: string;
  weight: number; // Number of descendants + 1 (self)
}

/**
 * Weighted Sector-Based Radial Layout Algorithm
 *
 * Improvements over standard Radial Tree Layout:
 * - Distributes angles based on "weight" (descendant count) instead of equally
 * - Nodes with more descendants get wider sectors, reducing overlap
 * - Subtrees are grouped naturally
 *
 * @param nodes - Array of mindmap nodes
 * @param edges - Array of connections between nodes
 * @returns Nodes with updated positions
 */
export function calculateWeightedRadialLayout(
  nodes: MindMapNode[],
  edges: MindmapData["edges"]
): MindMapNode[] {
  if (nodes.length === 0) return nodes;

  // Configuration
  const RADIUS_STEP = 180; // Distance between levels
  const MIN_ANGLE_GAP = 0.05; // Minimum gap between siblings (radians)

  // Step 1: Build tree structure
  const treeMap = new Map<string, TreeNode>();

  nodes.forEach((node) => {
    treeMap.set(node.id, { id: node.id, children: [], weight: 1 });
  });

  edges.forEach((edge) => {
    const parent = treeMap.get(edge.from);
    const child = treeMap.get(edge.to);
    if (parent && child) {
      parent.children.push(edge.to);
      child.parent = edge.from;
    }
  });

  // Find root (node without parent)
  const rootId = nodes.find((n) => !treeMap.get(n.id)?.parent)?.id;
  if (!rootId) return nodes;

  // Step 2: Calculate weights (number of descendants + self)
  function calculateWeight(nodeId: string): number {
    const node = treeMap.get(nodeId);
    if (!node) return 0;

    if (node.children.length === 0) {
      node.weight = 1;
    } else {
      node.weight =
        1 + node.children.reduce((sum, id) => sum + calculateWeight(id), 0);
    }
    return node.weight;
  }

  calculateWeight(rootId);

  // Step 3: Assign positions using weighted sectors
  const positions = new Map<string, { x: number; y: number }>();

  function layoutSubtree(
    nodeId: string,
    startAngle: number,
    endAngle: number,
    level: number
  ) {
    const node = treeMap.get(nodeId);
    if (!node) return;

    // Position this node at center of its sector
    if (level === 0) {
      positions.set(nodeId, { x: 0, y: 0 });
    } else {
      const midAngle = (startAngle + endAngle) / 2;
      const radius = level * RADIUS_STEP;
      positions.set(nodeId, {
        x: Math.cos(midAngle) * radius,
        y: Math.sin(midAngle) * radius,
      });
    }

    // Layout children with weighted sectors
    const children = node.children;
    if (children.length === 0) return;

    // Calculate total weight of all children
    const totalWeight = children.reduce(
      (sum, id) => sum + (treeMap.get(id)?.weight ?? 1),
      0
    );

    // Available angle range for children
    const availableAngle = endAngle - startAngle;

    // Distribute angles proportionally based on weight
    let currentAngle = startAngle;

    children.forEach((childId) => {
      const childWeight = treeMap.get(childId)?.weight ?? 1;
      const proportion = childWeight / totalWeight;
      const childAngleSize = Math.max(
        availableAngle * proportion - MIN_ANGLE_GAP,
        MIN_ANGLE_GAP
      );

      const childStartAngle = currentAngle + MIN_ANGLE_GAP / 2;
      const childEndAngle = currentAngle + childAngleSize;

      layoutSubtree(childId, childStartAngle, childEndAngle, level + 1);
      currentAngle = childEndAngle + MIN_ANGLE_GAP / 2;
    });
  }

  // Start layout from root, covering full circle (0 to 2π)
  layoutSubtree(rootId, 0, 2 * Math.PI, 0);

  // Apply calculated positions to nodes
  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }));
}
