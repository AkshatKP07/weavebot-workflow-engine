import { useState } from 'react';
import { apiClient } from '../../api/client';

export default function RunModal({ isOpen, onClose, workflow }) {
  const [fields, setFields] = useState([{ key: 'message', value: '' }]);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState(null);

  if (!isOpen) return null;

  const handleAddField = () => {
    setFields([...fields, { key: '', value: '' }]);
  };

  const handleRemoveField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, prop, val) => {
    const updated = [...fields];
    updated[index][prop] = val;
    setFields(updated);
  };

  const handleExecute = async () => {
    setIsRunning(true);
    setRunError(null);
    setRunResult(null);

    // Build the JSON payload from the user's input fields
    const payload = {};
    fields.forEach(({ key, value }) => {
      if (key.trim()) {
        payload[key.trim()] = value;
      }
    });

    try {
      if (!workflow?.id) {
        throw new Error('Please save the workflow first before running a test.');
      }

      // Use the proper authenticated test route we added to apiClient
      const data = await apiClient.testWorkflow(workflow.id, payload);
      setRunResult(data);
      
    } catch (err) {
      setRunError(err.message || 'Failed to start test run.');
    } finally {
      setIsRunning(false);
    }
  };

  // Helper to reset and close
  const handleClose = () => {
    setRunResult(null);
    setRunError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <span>⚡</span> Run Workflow
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate incoming data to test your nodes.
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Input Variables Form */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trigger Variables
            </label>
            <span className="text-xs text-slate-400">Reference using <code className="bg-slate-100 px-1 rounded text-indigo-600">{"{{trigger.key}}"}</code></span>
          </div>

          <div className="space-y-2.5">
            {fields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Variable (e.g. email)"
                  value={field.key}
                  onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                  className="w-2/5 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg  text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-mono text-xs"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. test@example.com)"
                  value={field.value}
                  onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                  className="w-3/5 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveField(idx)}
                    className="text-slate-400 hover:text-rose-500 p-1 transition"
                    title="Remove variable"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddField}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 transition"
          >
            + Add another variable
          </button>

          {/* Feedback Section */}
          {runError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {runError}
            </div>
          )}

          {runResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <strong>Execution queued!</strong> Check the Executions panel on the right sidebar to view the live logs.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            Close
          </button>
          <button
            onClick={handleExecute}
            disabled={isRunning}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition disabled:opacity-50 flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Triggering...
              </>
            ) : (
              'Run Now'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}