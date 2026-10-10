import { Play, Zap, Filter, Plug, Database } from 'lucide-react';

export default function Sidebar() {
  const onDragStart = (event, nodeType, label) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 relative">
      <div className="font-bold text-gray-700 mb-2 border-b pb-2">Node Palette</div>
      
      <div className="p-3 border-2 border-green-500 rounded-lg cursor-grab hover:bg-green-50 flex items-center gap-2 transition-colors" draggable onDragStart={(e) => onDragStart(e, 'trigger', 'New Trigger')}>
        <Play className="text-green-600 w-4 h-4"/>
        <span className="text-sm font-medium text-gray-700">Webhook Trigger</span>
      </div>
      <div className="p-3 border-2 border-orange-500 rounded-lg cursor-grab hover:bg-orange-50 flex items-center gap-2 transition-colors" draggable onDragStart={(e) => onDragStart(e, 'filter', 'Logic Filter')}>
        <Filter className="text-orange-600 w-4 h-4"/>
        <span className="text-sm font-medium text-gray-700">Logic Filter</span>
      </div>
      <div className="p-3 border-2 border-blue-500 rounded-lg cursor-grab hover:bg-blue-50 flex items-center gap-2 transition-colors" draggable onDragStart={(e) => onDragStart(e, 'action', 'New HTTP Request')}>
        <Zap className="text-blue-600 w-4 h-4"/>
        <span className="text-sm font-medium text-gray-700">HTTP Request</span>
      </div>
      <div className="p-3 border-2 border-purple-500 rounded-lg cursor-grab hover:bg-purple-50 flex items-center gap-2 transition-colors" draggable onDragStart={(e) => onDragStart(e, 'ai', 'New AI Task')}>
        <span className="text-purple-600 text-lg">✨</span> 
        <span className="text-sm font-medium text-gray-700">AI Prompt</span>
      </div>
      <div className="p-3 border-2 border-indigo-500 rounded-lg cursor-grab hover:bg-indigo-50 flex items-center gap-2 transition-colors" draggable onDragStart={(e) => onDragStart(e, 'integration', 'App Integration')}>
        <Plug className="text-indigo-600 w-4 h-4"/>
        <span className="text-sm font-medium text-gray-700">App Integration</span>
      </div>
      <div className="p-3 border-2 border-teal-500 rounded-lg cursor-grab hover:bg-teal-50 flex items-center gap-2 transition-colors" draggable onDragStart={(e) => onDragStart(e, 'knowledge_base', 'Select Database')}>
        <Database className="text-teal-600 w-4 h-4"/>
        <span className="text-sm font-medium text-gray-700">Knowledge Base (RAG)</span>
      </div>
    </div>
  );
}