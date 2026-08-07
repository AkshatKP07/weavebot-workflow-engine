import useStore from '../store';
import { Settings2, Lock } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPanel() {
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const nodes = useStore((state) => state.nodes);
  const updateNodeData = useStore((state) => state.updateNodeData);

  const [credInput, setCredInput] = useState('');

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 flex flex-col justify-center items-center text-gray-400 z-10 relative">
        <Settings2 className="w-12 h-12 mb-2 opacity-20" />
        <p className="text-sm text-center">Click a node on the canvas to configure it.</p>
      </div>
    );
  }

  const handleSaveCredential = async (provider, secretData) => {
    try {
      const res = await fetch('http://localhost:3001/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, data: secretData })
      });
      if (res.ok) alert(`Encrypted credentials saved for ${provider}! 🔒`);
      else alert('Failed to save credentials.');
    } catch (error) { // <-- Changed 'e' to 'error'
      console.error("Credential save failed:", error); // <-- Now it is used!
      alert('Error connecting to server.');
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-[-2px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 relative h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2 font-bold text-gray-700">
        <Settings2 className="w-5 h-5 text-gray-500" />
        Configure Node
      </div>

      <div className="p-4 flex flex-col gap-4">
        
        {/* SETTINGS FOR TRIGGER OR ACTION NODES */}
        {(selectedNode.type === 'trigger' || selectedNode.type === 'action') && (
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              {selectedNode.type === 'trigger' ? 'Webhook Endpoint' : 'Target URL'}
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
              value={selectedNode.data.label || ''}
              onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
              placeholder={selectedNode.type === 'trigger' ? '/webhook/my-trigger' : 'https://api.example.com'}
            />
          </div>
        )}

        {/* SETTINGS FOR FILTER NODE */}
        {selectedNode.type === 'filter' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Data Key (e.g., forwardedData.signal)
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-orange-500 focus:outline-none"
                value={selectedNode.data.filterKey || ''}
                onChange={(e) => updateNodeData(selectedNode.id, { filterKey: e.target.value, label: `${e.target.value || 'Key'} ${selectedNode.data.filterOperator || '=='} ${selectedNode.data.filterValue || 'Value'}` })}
                placeholder="forwardedData.sensor"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Operator
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-orange-500 focus:outline-none"
                value={selectedNode.data.filterOperator || '=='}
                onChange={(e) => updateNodeData(selectedNode.id, { filterOperator: e.target.value, label: `${selectedNode.data.filterKey || 'Key'} ${e.target.value} ${selectedNode.data.filterValue || 'Value'}` })}
              >
                <option value="==">Equals (==)</option>
                <option value="!=">Does not equal (!=)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Value to Match
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-orange-500 focus:outline-none"
                value={selectedNode.data.filterValue || ''}
                onChange={(e) => updateNodeData(selectedNode.id, { filterValue: e.target.value, label: `${selectedNode.data.filterKey || 'Key'} ${selectedNode.data.filterOperator || '=='} ${e.target.value}` })}
                placeholder="strong"
              />
            </div>
          </div>
        )}

        {/* SETTINGS FOR AI NODE */}
     {selectedNode.type === 'ai' && (
       <div className="flex flex-col gap-3">
         <div>
           <label className="block text-xs font-bold text-gray-600 mb-1">AI Model</label>
           <select
             className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-purple-500 focus:outline-none"
             value={selectedNode.data.provider || 'gemini'}
             onChange={(e) => updateNodeData(selectedNode.id, { provider: e.target.value })}
           >
             <option value="gemini">Google Gemini 1.5</option>
             <option value="openai">OpenAI GPT-4o</option>
             <option value="anthropic">Anthropic Claude 3</option>
           </select>
         </div>
         <div>
           <label className="block text-xs font-bold text-gray-600 mb-1">System Prompt Template</label>
           <textarea
             className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-purple-500 focus:outline-none min-h-30"
             value={selectedNode.data.prompt || ''} 
             onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
             placeholder="Summarize this: {{forwardedData.message}}"
           />
         </div>
       </div>
     )}

     {/* SETTINGS FOR KNOWLEDGE BASE (RAG) NODE */}
     {selectedNode.type === 'knowledge_base' && (
       <div className="flex flex-col gap-3">
         <div>
           <label className="block text-xs font-bold text-gray-600 mb-1">Select Database</label>
           <select
             className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-teal-500 focus:outline-none"
             value={selectedNode.data.databaseId || ''}
             onChange={(e) => updateNodeData(selectedNode.id, { databaseId: e.target.value, label: 'Document Store A' })}
           >
             <option value="">-- Choose Vector DB --</option>
             <option value="db_1">Employee Onboarding Docs</option>
             <option value="db_2">API Documentation</option>
           </select>
         </div>
         <div>
           <label className="block text-xs font-bold text-gray-600 mb-1">Max Chunk Size</label>
           <input
             type="number"
             className="w-full border border-gray-300 rounded-md p-2 text-sm"
             value={selectedNode.data.chunkSize || 1000}
             onChange={(e) => updateNodeData(selectedNode.id, { chunkSize: parseInt(e.target.value) })}
           />
         </div>
         <div>
           <label className="block text-xs font-bold text-gray-600 mb-1">Chunk Overlap</label>
           <input
             type="number"
             className="w-full border border-gray-300 rounded-md p-2 text-sm"
             value={selectedNode.data.chunkOverlap || 200}
             onChange={(e) => updateNodeData(selectedNode.id, { chunkOverlap: parseInt(e.target.value) })}
           />
         </div>
         <div>
           <label className="block text-xs font-bold text-gray-600 mb-1">Number of Chunks</label>
           <input
             type="number"
             className="w-full border border-gray-300 rounded-md p-2 text-sm"
             value={selectedNode.data.maxChunks || 5}
             onChange={(e) => updateNodeData(selectedNode.id, { maxChunks: parseInt(e.target.value) })}
           />
         </div>
       </div>
     )}

        {/* SETTINGS FOR INTEGRATION NODE */}
        {selectedNode.type === 'integration' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Select Provider
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-indigo-500 focus:outline-none"
                value={selectedNode.data.provider || 'discord'}
                onChange={(e) => updateNodeData(selectedNode.id, { provider: e.target.value, label: `${e.target.value.toUpperCase()} Action` })}
              >
                <option value="discord">Discord Webhook</option>
                <option value="custom_api">Custom Authenticated API</option>
              </select>
            </div>

            {selectedNode.data.provider === 'discord' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Message Template
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={selectedNode.data.message || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                    placeholder="E.g., AI Summary: {{steps.node-123.generatedText}}"
                  />
                </div>

                <div className="border-t pt-3 mt-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1 items-center gap-1">
                    <Lock className="w-3 h-3 text-indigo-600"/> Save Encrypted Discord Webhook URL
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm mb-2"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={credInput}
                    onChange={(e) => setCredInput(e.target.value)}
                  />
                  <button
                    onClick={() => handleSaveCredential('discord', { webhookUrl: credInput })}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded"
                  >
                    Save Key to Vault
                  </button>
                </div>
              </>
            )}

            {selectedNode.data.provider === 'custom_api' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-indigo-500 focus:outline-none"
                    value={selectedNode.data.endpointUrl || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { endpointUrl: e.target.value })}
                    placeholder="https://api.mycompany.com/v1/event"
                  />
                </div>

                <div className="border-t pt-3 mt-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1 items-center gap-1">
                    <Lock className="w-3 h-3 text-indigo-600"/> Save Encrypted Bearer API Key
                  </label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm mb-2"
                    placeholder="sk_live_..."
                    value={credInput}
                    onChange={(e) => setCredInput(e.target.value)}
                  />
                  <button
                    onClick={() => handleSaveCredential('custom_api', { apiKey: credInput })}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded"
                  >
                    Save Key to Vault
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* DEBUG INFO */}
        <div className="text-xs text-gray-400 mt-4 bg-gray-50 p-3 rounded">
          <strong>Node ID:</strong> {selectedNode.id}
          <br />
          <strong>Node Type:</strong> {selectedNode.type}
        </div>
      </div>
    </div>
  );
}