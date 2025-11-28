import { MindMapNode, MindmapData } from "@/stores/mindmap";

interface LayoutNode {
    id: string;
    level: number;
    children: string[];
    angle?: number;
    radius?: number;
}

/**
 * Radial Tree Layout Algorithm for Mindmaps
 * - Places root node at center (0, 0)
 * - Arranges children in concentric circles by level
 * - Evenly distributes nodes to avoid overlap
 * - Modern, clear visual hierarchy
 */
export function calculateRadialLayout(nodes: MindMapNode[], edges: MindmapData['edges']): MindMapNode[] {
    if (nodes.length === 0) return nodes;

    // Step 1: Build hierarchy (find root and levels)
    const nodeMap = new Map<string, LayoutNode>();
    const childToParent = new Map<string, string>();

    // Initialize nodes
    nodes.forEach(node => {
        nodeMap.set(node.id, {
            id: node.id,
            level: 0,
            children: [],
        });
    });

    // Build connections from edges
    edges.forEach(edge => {
        const parentNode = nodeMap.get(edge.from);
        if (parentNode) {
            parentNode.children.push(edge.to);
            childToParent.set(edge.to, edge.from);
        }
    });

    // Find root node (node with no parent)
    let rootId: string | undefined;
    for (const node of nodes) {
        if (!childToParent.has(node.id)) {
            rootId = node.id;
            break;
        }
    }

    // Fallback: use first node if no clear root
    if (!rootId) {
        rootId = nodes[0].id;
    }

    // Step 2: Calculate levels using BFS
    const queue: string[] = [rootId];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId) continue;

        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const current = nodeMap.get(currentId);
        if (!current) continue;

        // Process children
        current.children.forEach(childId => {
            if (!visited.has(childId)) {
                const child = nodeMap.get(childId);
                if (child) {
                    child.level = current.level + 1;
                    queue.push(childId);
                }
            }
        });
    }

    // Step 3: Group nodes by level
    const levelGroups = new Map<number, string[]>();
    nodeMap.forEach((node, id) => {
        const level = node.level;
        if (!levelGroups.has(level)) {
            levelGroups.set(level, []);
        }
        levelGroups.get(level)!.push(id);
    });

    // Step 4: Calculate positions
    const BASE_RADIUS = 250; // Distance between levels
    const MIN_ANGLE_SEPARATION = 15; // Minimum degrees between nodes

    const positions = new Map<string, { x: number; y: number }>();

    // Root at center
    positions.set(rootId, { x: 0, y: 0 });

    // Position nodes level by level
    levelGroups.forEach((nodeIds, level) => {
        if (level === 0) return; // Skip root

        const radius = level * BASE_RADIUS;
        const nodeCount = nodeIds.length;

        // Calculate angular separation
        const angleStep = 360 / Math.max(nodeCount, 1);
        const actualAngleStep = Math.max(angleStep, MIN_ANGLE_SEPARATION);

        // Distribute nodes evenly around the circle
        nodeIds.forEach((nodeId, index) => {
            const angle = (index * actualAngleStep) * (Math.PI / 180); // Convert to radians

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            positions.set(nodeId, { x, y });
        });
    });

    // Step 5: Apply positions to nodes
    return nodes.map(node => {
        const pos = positions.get(node.id) || { x: 0, y: 0 };
        return {
            ...node,
            position: pos,
        };
    });
}

/**
 * Compact Radial Layout - Better for dense graphs
 * Uses parent angle to position children in sectors
 */
export function calculateCompactRadialLayout(nodes: MindMapNode[], edges: MindmapData['edges']): MindMapNode[] {
    if (nodes.length === 0) return nodes;

    // Build hierarchy
    const nodeMap = new Map<string, { node: MindMapNode; children: string[]; parent?: string }>();

    nodes.forEach(node => {
        nodeMap.set(node.id, { node, children: [] });
    });

    edges.forEach(edge => {
        const parentNode = nodeMap.get(edge.from);
        const childNode = nodeMap.get(edge.to);
        if (parentNode && childNode) {
            parentNode.children.push(edge.to);
            childNode.parent = edge.from;
        }
    });

    // Find root
    let rootId = nodes.find(n => !nodeMap.get(n.id)?.parent)?.id || nodes[0].id;

    const positions = new Map<string, { x: number; y: number }>();
    const BASE_RADIUS = 200;

    // Recursive layout function
    function layoutSubtree(nodeId: string, startAngle: number, endAngle: number, level: number) {
        const data = nodeMap.get(nodeId);
        if (!data) return;

        const radius = level * BASE_RADIUS;
        const midAngle = (startAngle + endAngle) / 2;

        // Position this node
        if (level === 0) {
            positions.set(nodeId, { x: 0, y: 0 });
        } else {
            const x = Math.cos(midAngle) * radius;
            const y = Math.sin(midAngle) * radius;
            positions.set(nodeId, { x, y });
        }

        // Layout children
        const children = data.children;
        if (children.length > 0) {
            const angleRange = endAngle - startAngle;
            const anglePerChild = angleRange / children.length;

            children.forEach((childId, index) => {
                const childStart = startAngle + (index * anglePerChild);
                const childEnd = childStart + anglePerChild;
                layoutSubtree(childId, childStart, childEnd, level + 1);
            });
        }
    }

    // Start layout from root
    layoutSubtree(rootId, 0, 2 * Math.PI, 0);

    // Apply positions
    return nodes.map(node => ({
        ...node,
        position: positions.get(node.id) || { x: 0, y: 0 },
    }));
}
