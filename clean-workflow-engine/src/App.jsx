import { useState, useCallback } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import { Blocks, Rocket, Play, FolderOpen, Plus } from 'lucide-react';
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';

import { apiClient } from './api/client';
import useStore from './store/useWorkflowStore';

import TriggerNode from './components/nodes/TriggerNode';
import ActionNode from './components/nodes/ActionNode';
import FilterNode from './components/nodes/FilterNode';
import IntegrationNode from './components/nodes/IntegrationNode';
import KnowledgeBaseNode from './components/nodes/KnowledgeBaseNode';
import AiNode from './components/nodes/AiNode';

import Sidebar from './components/layout/Sidebar';
import SettingsPanel from './components/layout/SettingsPanel';
import TemplateModal from './components/modals/TemplateModal';
import DeployModal from './components/modals/DeployModal';
import RunModal from './components/modals/RunModal';
import ExecutionsPanel from './components/layout/ExecutionsPanel';
import SavedWorkflowsModal from './components/modals/SavedWorkflowsModal';
import NewWorkflowModal from './components/modals/NewWorkflowModal'; // New Import

import '@xyflow/react/dist/style.css';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  filter: FilterNode, 
  integration: IntegrationNode,
  knowledge_base: KnowledgeBaseNode,
  ai: AiNode
};

export default function App() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);
  const onConnect = useStore((state) => state.onConnect);
  const addNode = useStore((state) => state.addNode);
  const setSelectedNodeId = useStore((state) => state.setSelectedNodeId);

  const [activeWorkflowId, setActiveWorkflowId] = useState(null);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");

  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isSavedWorkflowsModalOpen, setIsSavedWorkflowsModalOpen] = useState(false); 
  const [isNewWorkflowModalOpen, setIsNewWorkflowModalOpen] = useState(false); // New State

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

  const handleSaveWorkflow = async () => {
    try {
      const savedWorkflow = await apiClient.saveWorkflow({
        id: activeWorkflowId, 
        name: workflowName, 
        graph: { nodes, edges } 
      });
      setActiveWorkflowId(savedWorkflow.id);
      setActiveWorkflow(savedWorkflow);
      alert("Workflow saved successfully! 🎉");
      return savedWorkflow;
    } catch (e) {
      console.error(e);
      alert("Failed to save workflow.");
      throw e;
    }
  };

  const handleOpenRunModal = async () => {
    if (!activeWorkflowId) {
      try {
        const saved = await handleSaveWorkflow();
        if (saved) setIsRunModalOpen(true);
      } catch {
        // Error already surfaced
      }
      return;
    }
    setIsRunModalOpen(true);
  };

  const handlePublishTemplate = async () => {
    try {
      if (!activeWorkflowId) {
        const savedWorkflow = await handleSaveWorkflow();
        await apiClient.publishTemplate(savedWorkflow.id);
      } else {
        await apiClient.publishTemplate(activeWorkflowId);
      }
      alert("Canvas published to the Discover Marketplace! 🌍");
    } catch (e) {
      console.error(e);
      alert("Failed to publish workflow.");
    }
  };

  return (
    <>
      <SignedOut>
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
          <SignIn />
        </div>
      </SignedOut>

      <SignedIn>
        <div className="flex flex-col w-full h-screen bg-slate-50">
          <div className="h-14 bg-indigo-600 flex items-center justify-between px-6 shadow-md z-20">
            <div className="flex items-center gap-4">
            <div className="text-white font-black text-xl tracking-tight">WeaveBot</div>
            <div className="h-6 w-px bg-indigo-400/50"></div>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-indigo-700/50 hover:bg-indigo-700 focus:bg-white focus:text-slate-900 text-white text-sm font-semibold px-3 py-1.5 rounded outline-none transition-colors border border-transparent focus:border-indigo-300 w-64 placeholder-indigo-300"
              placeholder="Name your workflow..."
            />
          </div>
            <div className="flex items-center gap-3">
              
              <button 
                onClick={() => setIsNewWorkflowModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-1.5 px-4 rounded-md shadow transition-colors flex items-center gap-2 border border-slate-700"
              >
                <Plus className="w-4 h-4" /> New
              </button>

              <button 
                onClick={() => setIsSavedWorkflowsModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-1.5 px-4 rounded-md shadow transition-colors flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" /> Open Saved
              </button>

              <button 
                onClick={handleSaveWorkflow} 
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold py-1.5 px-4 rounded-md shadow transition-colors flex items-center gap-2"
              >
                 Save Workflow
              </button>
              
              <button 
                onClick={handleOpenRunModal} 
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-1.5 px-4 rounded-md shadow transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" /> Test Run
              </button>

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
              <div className="ml-2 flex items-center justify-center bg-white rounded-full p-0.5 shadow-sm">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
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
            
            <div className="flex flex-col w-80 border-l border-gray-200 bg-white h-full">
               <div className="flex-1 overflow-y-auto">
                 <SettingsPanel />
               </div>
               <div className="border-t border-gray-200">
                 <ExecutionsPanel workflowId={activeWorkflowId} />
               </div>
            </div>
          </div>
          
          <TemplateModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} />
          <DeployModal isOpen={isDeployModalOpen} onClose={() => setIsDeployModalOpen(false)} />
          <RunModal isOpen={isRunModalOpen} onClose={() => setIsRunModalOpen(false)} workflow={activeWorkflow || { id: activeWorkflowId }} />
          <SavedWorkflowsModal 
            isOpen={isSavedWorkflowsModalOpen} 
            onClose={() => setIsSavedWorkflowsModalOpen(false)} 
            onLoad={(workflow) => {
              let graph = workflow.graph;
              if (typeof graph === 'string') {
                try { graph = JSON.parse(graph); } catch (error) { console.warn(error); }
              }
              useStore.setState({ 
                nodes: graph?.nodes || workflow.nodes || [], 
                edges: graph?.edges || workflow.edges || [], 
                selectedNodeId: null 
              });
              setActiveWorkflowId(workflow.id);
              setActiveWorkflow(workflow);
              setWorkflowName(workflow.name || 'Untitled Workflow');
              setIsSavedWorkflowsModalOpen(false);
            }}
          />
          <NewWorkflowModal 
            isOpen={isNewWorkflowModalOpen} 
            onClose={() => setIsNewWorkflowModalOpen(false)} 
            onConfirm={(newName) => {
              setActiveWorkflowId(null);
              setActiveWorkflow(null);
              setWorkflowName(newName);
              setIsNewWorkflowModalOpen(false);
            }}
          />
        </div>
      </SignedIn>
    </>
  );
}