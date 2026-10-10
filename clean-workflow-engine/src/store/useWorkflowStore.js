import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

const initialNodes = [
  { id: 'node-1', type: 'trigger', position: { x: 100, y: 250 }, data: { label: 'Listens to: /webhook/catch' } },
];

const useStore = create((set, get) => ({
  nodes: initialNodes,
  edges: [],
  selectedNodeId: null, // NEW: Tracks which node is clicked
  
  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  // NEW: Sets the currently clicked node
  setSelectedNodeId: (id) => {
    set({ selectedNodeId: id });
  },

  // NEW: Updates the data inside a specific node
  updateNodeData: (nodeId, newData) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      }),
    });
  }
}));

export default useStore;