import { useState } from 'react';
import { X, Radio, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import useStore from '../store';

export default function DeployModal({ isOpen, onClose }) {
  const nodes = useStore((state) => state.nodes);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Find the trigger node to get the webhook endpoint
  const triggerNode = nodes.find(n => n.type === 'trigger');
  
  // Clean up the endpoint string (ensure it starts with /webhook/)
  let endpoint = triggerNode?.data?.label || '/webhook/my-trigger';
  if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
  if (!endpoint.startsWith('/webhook')) endpoint = '/webhook' + endpoint.replace('/webhook', '');

  const fullWebhookUrl = `http://localhost:3001${endpoint}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullWebhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
        
        {/* Header with Pulse Animation */}
        <div className="bg-slate-900 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Radio className="w-6 h-6 text-green-400" />
              </div>
              {/* Radar Ping Animation */}
              {triggerNode && (
                <div className="absolute inset-0 border-2 border-green-500 rounded-full animate-ping opacity-20"></div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">
                {triggerNode ? 'System Online & Listening' : 'System Offline'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {triggerNode ? 'Your workflow is ready to receive data.' : 'Add a Webhook Trigger node first.'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 bg-white">
          {!triggerNode ? (
            <div className="flex bg-orange-50 p-4 rounded-lg border border-orange-200 text-orange-800 text-sm gap-3 items-start">
              <AlertCircle className="w-5 h-5 shrink-0 text-orange-500" />
              <p>You cannot deploy this workflow yet. Please drag a <strong>Webhook Trigger</strong> node onto the canvas and save it.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-600 font-medium">
                Send a POST request to this URL to trigger your automation:
              </p>
              
              <div className="flex items-center gap-2">
                <div className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-mono p-3 rounded-lg flex-1 overflow-x-auto whitespace-nowrap">
                  {fullWebhookUrl}
                </div>
                <button 
                  onClick={handleCopy}
                  className={`p-3 rounded-lg flex items-center justify-center transition-colors ${
                    copied ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <div className="mt-4 bg-gray-50 border border-gray-100 rounded-lg p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">cURL Example</h4>
                <pre className="text-[11px] text-gray-600 font-mono overflow-x-auto">
{`curl -X POST ${fullWebhookUrl} \\
-H "Content-Type: application/json" \\
-d '{"message": "Hello AI!"}'`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}