import { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function MicroApp({ workflowId }) {
  // Defaulting to "topic" for testing, but users can add more fields
  const [variables, setVariables] = useState({ topic: '' });
  const [status, setStatus] = useState('idle'); // idle, running, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('running');

    try {
      // Safely route to the public webhook endpoint (bypassing /api)
      let BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      BASE_URL = BASE_URL.replace(/\/api$/, '').replace(/\/+$/, '');
      
      const response = await fetch(`${BASE_URL}/webhook/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables)
      });

      if (!response.ok) throw new Error('Failed to trigger workflow');
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-8 text-center">
          <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Run AI Workflow</h1>
          <p className="text-indigo-100 text-sm">ID: {workflowId.slice(0, 8)}...</p>
        </div>

        <div className="p-6">
          {status === 'success' ? (
            <div className="text-center py-6 text-emerald-600">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-lg font-bold">Execution Queued!</h3>
              <p className="text-sm text-slate-500 mt-1">The background worker is processing your task.</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-6 text-indigo-600 font-semibold text-sm hover:underline"
              >
                Run another task
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Quantum Computing"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={variables.topic}
                  onChange={(e) => setVariables({ ...variables, topic: e.target.value })}
                />
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Failed to trigger. Check console logs.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'running'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                {status === 'running' ? 'Processing...' : 'Run Workflow'}
                {status !== 'running' && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}