import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Trash2, FolderOpen, Loader2, Play, CheckSquare, Square, Activity, StopCircle } from 'lucide-react';

export default function SavedWorkflowsModal({ isOpen, onClose, onLoad }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeploying, setIsDeploying] = useState(false);
  const [isUndeploying, setIsUndeploying] = useState(false);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const data = await apiClient.listWorkflows();
      setWorkflows(data || []);
    } catch (error) {
      console.error("Failed to load workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadWorkflows();
      setSelectedIds(new Set()); // Reset selections when modal opens
    }
  }, [isOpen]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this workflow? This cannot be undone.')) return;
    try {
      await apiClient.deleteWorkflow(id);
      setWorkflows(workflows.filter(w => w.id !== id));
      
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    } catch (error) {
      console.error("Deletion error:", error); 
      alert('Failed to delete workflow.');
    }
  };

  const toggleSelection = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkDeploy = async () => {
    if (selectedIds.size === 0) return;
    setIsDeploying(true);

    try {
      await apiClient.bulkDeployWorkflows(Array.from(selectedIds));
      await loadWorkflows(); // Refresh list to show green 'DEPLOYED' badges
      setSelectedIds(new Set()); // Clear checkboxes
    } catch (error) {
      console.error("Bulk deployment failed:", error);
      alert("Failed to deploy workflows.");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleBulkUndeploy = async () => {
    if (selectedIds.size === 0) return;
    setIsUndeploying(true);

    try {
      await apiClient.bulkUndeployWorkflows(Array.from(selectedIds));
      await loadWorkflows(); // Refresh list to show grey 'DRAFT' badges
      setSelectedIds(new Set()); // Clear checkboxes
    } catch (error) {
      console.error("Bulk undeployment failed:", error);
      alert("Failed to stop workflows.");
    } finally {
      setIsUndeploying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full flex flex-col max-h-[85vh] shadow-2xl text-slate-200">
        
        {/* Header with Deploy & Stop Buttons */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 rounded-t-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            My Saved Workflows
          </h2>
          
          <div className="flex items-center gap-3">
            {/* STOP BUTTON */}
            <button
              onClick={handleBulkUndeploy}
              disabled={selectedIds.size === 0 || isUndeploying || isDeploying}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors
                ${selectedIds.size > 0 
                  ? 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer shadow-md' 
                  : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'}`}
            >
              {isUndeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
              {isUndeploying ? 'Stopping...' : 'Stop'}
            </button>

            {/* DEPLOY BUTTON */}
            <button
              onClick={handleBulkDeploy}
              disabled={selectedIds.size === 0 || isDeploying || isUndeploying}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors
                ${selectedIds.size > 0 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md' 
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}`}
            >
              {isDeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isDeploying ? 'Deploying...' : 'Deploy'}
            </button>
            
            <button onClick={onClose} className="text-slate-400 hover:text-white transition ml-2">✕</button>
          </div>
        </div>

        {/* Workflow List */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 rounded-b-xl">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg">No saved workflows found.</p>
              <p className="text-sm mt-1">Click "Save Workflow" on the canvas to store one here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {workflows.map((wf) => {
                const isDeployed = wf.isActive === true;

                return (
                  <div key={wf.id} className={`bg-slate-900 border rounded-lg p-4 flex items-center justify-between transition group
                    ${selectedIds.has(wf.id) ? 'border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.1)]' : 'border-slate-800 hover:border-slate-700'}`}>
                    
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <button onClick={() => toggleSelection(wf.id)} className="text-slate-400 hover:text-indigo-400 transition shrink-0">
                        {selectedIds.has(wf.id) ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
                      </button>
                      
                      {/* Workflow Details */}
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-white text-sm">{wf.name || 'Untitled Workflow'}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                            ${isDeployed ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                            {isDeployed && <Activity className="w-3 h-3" />}
                            {isDeployed ? 'Deployed' : 'Draft'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                          <span>ID: <span className="font-mono text-slate-500">{wf.id.split('-')[0]}...</span></span>
                          <span>•</span>
                          <span>Updated: {new Date(wf.updatedAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onLoad(wf)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded transition"
                      >
                        Open Canvas
                      </button>
                      <button 
                        onClick={() => handleDelete(wf.id)}
                        className="p-1.5 bg-red-950/30 text-red-400 hover:bg-red-900 hover:text-red-200 border border-transparent hover:border-red-800 rounded transition"
                        title="Delete Workflow"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}