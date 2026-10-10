import { apiClient } from '../../api/client';
import { useState, useEffect, useMemo } from 'react';
import { X, Blocks, Loader2, Search, Trash2 } from 'lucide-react';
import useStore from '../../store/useWorkflowStore';

export default function TemplateModal({ isOpen, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getTemplateTags = (graphData) => {
    let graph = { nodes: [] };
    if (typeof graphData === 'string') {
      try { graph = JSON.parse(graphData); } catch { /* ignore */ }
    } else if (graphData) {
      graph = graphData;
    }
    
    const types = new Set((graph.nodes || []).map(n => n.type));
    return Array.from(types).slice(0, 3);
  };

  const loadTemplates = async (pageNum, isInitial = false) => {
    if (isInitial) setTemplates([]);
    setIsLoading(true);
    
    try {
      const response = await apiClient.getTemplates(pageNum);
      const fetchedTemplates = response.data || [];
      const totalPages = response.meta?.totalPages || 1;

      if (isInitial) {
        setTemplates(fetchedTemplates);
        setPage(1); 
      } else {
        setTemplates(prev => [...prev, ...fetchedTemplates]);
        setPage(pageNum);
      }
      
      setHasMore(pageNum < totalPages);
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setSearchQuery(''); 
        loadTemplates(1, true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadTemplates(page + 1, false);
    }
  };

  // 1. DELETE FUNCTION PROPERLY SCOPED HERE
  const handleDeleteTemplate = async (e, templateId) => {
    e.stopPropagation(); // Prevents the card click from cloning the template
    
    if (!window.confirm("Are you sure you want to remove this template from the marketplace?")) return;

    try {
      await apiClient.deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (error) {
      console.error("Delete template error:", error);
      alert("Failed to delete template.");
    }
  };

  const handleUseTemplate = async (templateId) => {
    try {
      const newWorkflow = await apiClient.useTemplate(templateId);
      if (newWorkflow.graph) {
        let graph = newWorkflow.graph;
        if (typeof graph === 'string') {
          try { graph = JSON.parse(graph); } catch (error) { console.warn(error); }
        }
        
        useStore.setState({
          nodes: graph.nodes || [],
          edges: graph.edges || [],
          selectedNodeId: null
        });
      }
      onClose();
      alert("Template loaded into your workspace! 🎉");
    } catch (error) {
      console.error("Template clone error:", error);
      alert("Failed to load template.");
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const lowerQuery = searchQuery.toLowerCase();
    return templates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) || 
      (t.description && t.description.toLowerCase().includes(lowerQuery))
    );
  }, [templates, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header & Search */}
        <div className="p-6 border-b border-gray-100 bg-white z-10 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900">Discover Templates</h2>
              <p className="text-gray-500 mt-1">Jumpstart your automation with pre-built workflows.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by name or description (e.g., 'Support Bot')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50 flex flex-col">
          {filteredTemplates.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Blocks className="w-16 h-16 mb-4 opacity-20" />
              <p>{searchQuery ? "No templates match your search." : "No templates published yet."}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(template => (
                  <div 
                    key={template.id} 
                    onClick={() => handleUseTemplate(template.id)} 
                    className="relative bg-white border-2 border-gray-100 rounded-2xl p-6 flex flex-col text-left cursor-pointer hover:border-indigo-500 hover:shadow-xl transition-all group"
                  >
                    
                    {/* 2. TRASH BUTTON USED HERE */}
                    {template.isOwner && (
                      <button 
                        onClick={(e) => handleDeleteTemplate(e, template.id)}
                        className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all z-10"
                        title="Delete from Marketplace"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                        <Blocks className="w-6 h-6 text-indigo-500" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">
                        {template.name.replace(' (Template)', '')}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-gray-500 line-clamp-3 mb-5 flex-1">
                      {template.description || "A custom automation workflow. Click to clone into your workspace."}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-50">
                      {getTemplateTags(template.graph).map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md capitalize">
                          {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="mt-8 flex justify-center pb-4">
                {isLoading && templates.length > 0 && (
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                )}
                {hasMore && !isLoading && !searchQuery && (
                  <button 
                    onClick={handleLoadMore}
                    className="bg-white border-2 border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 font-bold py-2 px-6 rounded-full shadow-sm transition-all text-sm"
                  >
                    Load More
                  </button>
                )}
                {!hasMore && templates.length > 0 && !searchQuery && (
                  <p className="text-sm text-slate-400 font-medium mt-4">You've reached the end of the marketplace!</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}