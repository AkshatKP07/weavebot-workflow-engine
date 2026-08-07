import { useState, useCallback } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Blocks, Rocket } from 'lucide-react'; // <-- ADD Rocket here

import useStore from './store';
import TriggerNode from './components/TriggerNode';
import ActionNode from './components/ActionNode';
import FilterNode from './components/FilterNode';
import IntegrationNode from './components/IntegrationNode';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import KnowledgeBaseNode from './components/KnowledgeBaseNode';
import TemplateModal from './components/TemplateModal';
import DeployModal from './components/DeployModal';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  filter: FilterNode, 
  integration: IntegrationNode,
  knowledge_base: KnowledgeBaseNode
};

export default function App() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onConnect = useStore((state) => state.onConnect);
  const addNode = useStore((state) => state.addNode);
  const setSelectedNodeId = useStore((state) => state.setSelectedNodeId);

  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    const label = event.dataTransfer.getData('application/label');

    if (typeof type === 'undefined' || !type || !reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: { label, provider: type === 'integration' ? 'discord' : undefined },
    };
    addNode(newNode);
  }, [reactFlowInstance, addNode]);

  const onSelectionChange = useCallback(({ nodes }) => {
    if (nodes.length > 0) {
      setSelectedNodeId(nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, [setSelectedNodeId]);

  // Saves the current canvas, then immediately publishes it as a public template
  const handlePublishTemplate = async () => {
    try {
      // 1. Save workflow
      const saveRes = await fetch('http://localhost:3001/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "My Custom AI Workflow", graph: { nodes, edges } }),
      });
      
      if (!saveRes.ok) throw new Error("Failed to save workflow");
      const savedWorkflow = await saveRes.json();

      // 2. Publish as template
      const publishRes = await fetch(`http://localhost:3001/api/templates/publish/${savedWorkflow.id}`, { 
        method: 'POST' 
      });
      
      if (!publishRes.ok) throw new Error("Failed to publish workflow");
      
      alert("Canvas published to the Discover Marketplace! 🌍");
    } catch (e) {
      console.error(e);
      alert("Failed to publish workflow.");
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-slate-50">
      
      {/* HEADER BAR */}
      <div className="h-14 bg-indigo-600 flex items-center justify-between px-6 shadow-md z-20">
        <div className="text-white font-black text-xl tracking-tight">WeaveBot / Orchestrator</div>
        <div className="flex gap-3">
       <button 
         onClick={() => setIsDeployModalOpen(true)}
         className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-1.5 px-4 rounded-md shadow transition-colors flex items-center gap-2"
       >
         <Rocket className="w-4 h-4" /> Deploy
       </button>

       <button 
         onClick={handlePublishTemplate}
         className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold py-1.5 px-4 rounded-md transition-colors"
       >
         Publish as Template
       </button>

       <button 
         onClick={() => setIsTemplateModalOpen(true)}
         className="bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-bold py-1.5 px-4 rounded-md shadow transition-colors flex items-center gap-2"
       >
         <Blocks className="w-4 h-4" /> Discover Templates
       </button>
     </div>
      </div>

      {/* Main Builder Area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onSelectionChange={onSelectionChange}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#ccc" gap={16} />
            <Controls />
          </ReactFlow>
        </div>
        <SettingsPanel />
      </div>

      {/* The Marketplace Modal */}
      <TemplateModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} />
      <DeployModal isOpen={isDeployModalOpen} onClose={() => setIsDeployModalOpen(false)} />
    </div>
  );
}