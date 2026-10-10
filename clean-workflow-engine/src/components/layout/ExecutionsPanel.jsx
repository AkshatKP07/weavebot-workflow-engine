import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react'; 

// 1. Calculate URL safely
let BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
BASE_URL = BASE_URL.replace(/\/+$/, '');
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// Helper to safely render ANY data type without crashing React
const safeRender = (data) => {
  if (!data) return '';
  if (typeof data === 'object') return JSON.stringify(data, null, 2);
  return String(data);
};

export default function ExecutionsPanel({ workflowId }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const { getToken } = useAuth(); 

  useEffect(() => {
    if (!workflowId) return;

    let isMounted = true;
    let timeoutId;
    let errorCount = 0;
    let isFirstFetch = true; // Tracks initial load without triggering dependency warnings

    const fetchExecutions = async () => {
      if (!isMounted) return;

      // Only trigger the loading UI on the very first fetch for this workflow
      if (isFirstFetch) {
        setLoading(true);
        isFirstFetch = false;
      }

      try {
        const token = await getToken(); 

        const response = await fetch(`${API_URL}/workflows/${workflowId}/executions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (isMounted) {
          setExecutions(data);
          setError(null); 
          errorCount = 0; // Reset errors on success
          setIsPollingPaused(false);
          // Schedule the next background poll
          timeoutId = setTimeout(fetchExecutions, 5000); 
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Executions fetch error:", err);
        errorCount++;
        
        // Stop spamming if the server is completely unreachable
        if (errorCount >= 3) {
          setError("Connection lost. Polling paused.");
          setIsPollingPaused(true);
        } else {
          setError(err.message);
          timeoutId = setTimeout(fetchExecutions, 5000); 
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExecutions();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [workflowId, getToken]);

  if (!workflowId) return <div className="p-4 text-xs text-slate-400">Save a workflow to view execution history.</div>;
  if (loading && executions.length === 0) return <div className="p-4 text-xs text-slate-500">Loading history...</div>;

  return (
    <div className="bg-slate-50 p-4 max-h-72 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-800">Execution History</h3>
        {isPollingPaused && (
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold hover:bg-rose-200 transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-3 p-2 text-[11px] bg-rose-50 text-rose-600 rounded border border-rose-200">
          Error: {error}
        </div>
      )}

      {executions.length === 0 ? (
        <p className="text-xs text-slate-500">No runs recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {executions.map((exec) => (
            <div key={exec.id} className="bg-white p-2.5 rounded border border-slate-200 text-xs shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className={`px-1.5 py-0.5 font-semibold rounded ${
                  exec.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {exec.status.toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-400">
                  {exec.startedAt ? new Date(exec.startedAt).toLocaleTimeString() : 'Unknown time'}
                </span>
              </div>
              
              <div className="mt-1 bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-pre-wrap">
                {exec.resultData ? safeRender(exec.resultData) : 'No output recorded.'}
              </div>

              {exec.logs && (
                <div className="mt-1 text-[11px] text-rose-600 bg-rose-50 p-1.5 rounded overflow-x-auto whitespace-pre-wrap">
                  {safeRender(exec.logs)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}