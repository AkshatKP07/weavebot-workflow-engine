import { useState } from 'react';
import { AlertTriangle, PlusCircle } from 'lucide-react';
import useStore from '../../store/useWorkflowStore';

export default function NewWorkflowModal({ isOpen, onClose, onConfirm }) {
  const [name, setName] = useState('Untitled Workflow');
  const nodes = useStore((state) => state.nodes);

  if (!isOpen) return null;

  const hasNodes = nodes.length > 0;

  const handleCreate = (e) => {
    e.preventDefault();
    
    // Clear canvas state directly in the modal
    useStore.setState({ nodes: [], edges: [], selectedNodeId: null });
    
    // Pass the new name back to App.jsx
    onConfirm(name);
    
    // Reset local state for the next time the modal opens
    setName('Untitled Workflow');
  };

  const handleClose = () => {
    // Reset local state so it's clean for the next opening
    setName('Untitled Workflow');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold">Create New Workflow</h2>
        </div>

        {hasNodes && (
          <div className="flex gap-3 items-start bg-amber-950/40 border border-amber-900/50 p-4 rounded-lg mb-5 text-amber-200 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <p>You have unsaved changes on your canvas. Starting a new workflow will clear your current progress.</p>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Workflow Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Support Ticket Router"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold rounded bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg"
            >
              Start Blank Canvas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}