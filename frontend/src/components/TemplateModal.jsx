import { useState, useEffect } from 'react';
import { X, Blocks } from 'lucide-react';
import useStore from '../store';

export default function TemplateModal({ isOpen, onClose }) {
  const [templates, setTemplates] = useState([]);
  const setNodes = useStore((state) => state.setNodes);
  const setEdges = useStore((state) => state.setEdges);

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:3001/api/templates')
        .then(res => res.json())
        .then(data => setTemplates(data))
        .catch(err => console.error("Failed to load templates", err));
    }
  }, [isOpen]);

  const handleUseTemplate = async (templateId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/templates/use/${templateId}`, {
        method: 'POST'
      });
      const newWorkflow = await res.json();
      
      // Load the cloned graph into the React Flow canvas!
      if (newWorkflow.graph) {
        setNodes(newWorkflow.graph.nodes || []);
        setEdges(newWorkflow.graph.edges || []);
      }
      onClose();
      alert("Template loaded into your workspace! 🎉");
    } catch (error) {
      console.error("Template clone error:", error); // <-- FIXED: Now 'error' is used
      alert("Failed to load template.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900">Browse Templates</h2>
            <p className="text-gray-500 mt-1">Discover templates for your needs and get started with automation—no coding required.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Categories */}
          <div className="w-64 bg-gray-50 border-r border-gray-100 p-6 flex flex-col gap-3 overflow-y-auto">
            <div className="font-bold text-lg mb-2 flex items-center gap-2">
              Discover <span className="text-xs">▼</span>
            </div>
            {['All Templates', 'Gmail', 'Discord', 'Assistant', 'Gen AI', 'Saved'].map(cat => (
              <button key={cat} className={`text-left px-4 py-2 rounded-lg font-bold text-sm ${cat === 'All Templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Template Grid */}
          <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Blocks className="w-16 h-16 mb-4 opacity-20" />
                <p>No templates published yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {templates.map(template => (
                  <div key={template.id} onClick={() => handleUseTemplate(template.id)} className="bg-white border-2 border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 hover:shadow-lg transition-all aspect-square group">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Blocks className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm leading-tight">{template.name.replace(' (Template)', '')}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}