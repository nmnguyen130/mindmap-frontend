import { MindMap, MindMapNode } from "@/stores/mindmaps";

export const defaultMindMap: MindMap = {
  id: "default-demo",
  title: "Demo Mind Map",
  createdAt: new Date(),
  updatedAt: new Date(),
  nodes: [
    {
      id: "central-node",
      text: "Central Idea",
      position: { x: 400, y: 300 },
      notes:
        "This is the central idea of the demo map. Imagine it as the main topic or chapter of your document.",
      connections: ["node-1", "node-2", "node-3", "node-4"],
    },
    {
      id: "node-1",
      text: "Concept 1 and concep 2",
      position: { x: 200, y: 150 },
      notes: "High-level summary for concept 1. Replace this with your own notes from the source.",
      connections: ["node-1-1", "node-1-2"],
    },
    {
      id: "node-2",
      text: "Concept 2",
      position: { x: 600, y: 150 },
      notes: "Short description of concept 2.",
      connections: ["node-2-1"],
    },
    {
      id: "node-3",
      text: "Concept 3",
      position: { x: 200, y: 450 },
      connections: ["node-3-1", "node-3-2"],
    },
    {
      id: "node-4",
      text: "Concept 4",
      position: { x: 600, y: 450 },
      connections: [],
    },
    {
      id: "node-1-1",
      text: "Sub-concept 1.1",
      position: { x: 80, y: 80 },
      connections: [],
    },
    {
      id: "node-1-2",
      text: "Sub-concept 1.2",
      position: { x: 320, y: 80 },
      connections: [],
    },
    {
      id: "node-2-1",
      text: "Sub-concept 2.1",
      position: { x: 680, y: 80 },
      connections: [],
    },
    {
      id: "node-3-1",
      text: "Sub-concept 3.1",
      position: { x: 80, y: 520 },
      connections: [],
    },
    {
      id: "node-3-2",
      text: "Sub-concept 3.2",
      position: { x: 320, y: 520 },
      connections: [],
    },
  ],
};
