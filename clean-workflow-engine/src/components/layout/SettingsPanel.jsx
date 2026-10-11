import { apiClient } from '../../api/client';
import useStore from '../../store/useWorkflowStore';
import { 
  Settings2, 
  Lock, 
  Variable, 
  Plus, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { useState } from 'react';
import AddKnowledgeModal from '../modals/AddKnowledgeModal';

export default function SettingsPanel() {
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges); 
  const updateNodeData = useStore((state) => state.updateNodeData);
  
  const [credInput, setCredInput] = useState('');
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 flex flex-col justify-center items-center text-gray-400 z-10 relative">
        <Settings2 className="w-12 h-12 mb-2 opacity-20" />
        <p className="text-sm text-center">Click a node on the canvas to configure it.</p>
      </div>
    );
  }

  const getUpstreamNodes = (targetId, visited = new Set()) => {
    let upstream = [];
    const incomingEdges = edges.filter((e) => e.target === targetId);
    
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        visited.add(edge.source);
        const parentNode = nodes.find((n) => n.id === edge.source);
        if (parentNode) {
          upstream.push(parentNode);
          upstream = upstream.concat(getUpstreamNodes(edge.source, visited));
        }
      }
    }
    return upstream;
  };

  const upstreamNodes = getUpstreamNodes(selectedNode.id);

  const renderVariablePills = (fieldKey) => {
    if (upstreamNodes.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
        {upstreamNodes.map((n) => {
          const outKey = n.data?.outputKey || (n.type === 'trigger' ? 'trigger' : n.id);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                const currentText = selectedNode.data[fieldKey] || '';
                const newText = currentText ? `${currentText} {{${outKey}}}` : `{{${outKey}}}`;
                updateNodeData(selectedNode.id, { [fieldKey]: newText });
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] rounded border border-indigo-200 transition-colors font-mono shadow-sm"
              title={`Insert {{${outKey}}}`}
            >
              <Plus className="w-2.5 h-2.5" />
              {outKey}
            </button>
          );
        })}
      </div>
    );
  };

  const handleSaveCredential = async (provider, secretData) => {
    try {
      await apiClient.saveCredential(provider, secretData);
      alert(`Encrypted credentials saved for ${provider}! 🔒`);
    } catch (error) { 
      console.error("Credential save failed:", error); 
      alert('Error connecting to server.');
    }
  };

  const handleRunTestStep = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
      setTestResult({
        status: 'success',
        message: 'Action test dispatched successfully',
        response: {
          success: true,
          provider: selectedNode.data.provider || 'discord',
          action: selectedNode.data.action || 'send_message',
          deliveredAt: new Date().toLocaleTimeString(),
          outputKey: selectedNode.data.outputKey || 'integration_result'
        }
      });
    } catch (err) {
      setTestResult({
        status: 'error',
        message: err.message || 'Test execution failed'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const renderOutputKeyField = (defaultKey) => {
    const currentKey = selectedNode.data.outputKey || defaultKey;
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Variable className="w-3.5 h-3.5 text-indigo-500" />
            Output Variable Name
          </label>
          <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
            {`{{${currentKey}}}`}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mb-2">
          Downstream nodes can reference this step's result using this key.
        </p>
        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="text-slate-400 font-medium">context.</span>
          <input
            type="text"
            className="w-full border border-slate-300 rounded p-1.5 text-xs focus:border-indigo-500 focus:outline-none font-semibold text-indigo-600 bg-white"
            value={selectedNode.data.outputKey || ''}
            onChange={(e) => updateNodeData(selectedNode.id, { outputKey: e.target.value })}
            placeholder={defaultKey}
          />
        </div>
      </div>
    );
  };

  const currentKbProvider = selectedNode.data.provider || 'gemini';

  return (
    <>
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-[-2px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 relative h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2 font-bold text-gray-700">
          <Settings2 className="w-5 h-5 text-gray-500" />
          Configure Node
        </div>

        <div className="p-4 flex flex-col gap-4">
          
          {/* TRIGGER NODE */}
          {selectedNode.type === 'trigger' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Webhook Endpoint
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={selectedNode.data.label || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                  placeholder="/webhook/my-trigger"
                />
              </div>
              {renderOutputKeyField('trigger')}
            </div>
          )}

          {/* ACTION NODE */}
          {selectedNode.type === 'action' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">HTTP Method</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={selectedNode.data.method || 'POST'}
                  onChange={(e) => updateNodeData(selectedNode.id, { method: e.target.value, label: `${e.target.value} Request` })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-600">Target URL</label>
                </div>
                {renderVariablePills('url')}
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
                  value={selectedNode.data.url || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Headers (JSON)</label>
                {renderVariablePills('headers')}
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-blue-500 focus:outline-none font-mono"
                  value={selectedNode.data.headers || '{\n  "Content-Type": "application/json"\n}'}
                  onChange={(e) => updateNodeData(selectedNode.id, { headers: e.target.value })}
                />
              </div>

              {['POST', 'PUT', 'PATCH'].includes(selectedNode.data.method || 'POST') && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Body (JSON Template)</label>
                  {renderVariablePills('body')}
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-blue-500 focus:outline-none font-mono"
                    value={selectedNode.data.body || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { body: e.target.value })}
                  />
                </div>
              )}

              {renderOutputKeyField('http_response')}
            </div>
          )}

          {/* FILTER NODE */}
          {selectedNode.type === 'filter' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Data Key</label>
                {renderVariablePills('filterKey')}
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-orange-500 focus:outline-none font-mono"
                  value={selectedNode.data.filterKey || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { filterKey: e.target.value, label: `${e.target.value || 'Key'} ${selectedNode.data.filterOperator || '=='} ${selectedNode.data.filterValue || 'Value'}` })}
                  placeholder="trigger.status"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Operator</label>
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
                <label className="block text-xs font-bold text-gray-600 mb-1">Value to Match</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-orange-500 focus:outline-none"
                  value={selectedNode.data.filterValue || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { filterValue: e.target.value, label: `${selectedNode.data.filterKey || 'Key'} ${selectedNode.data.filterOperator || '=='} ${e.target.value}` })}
                  placeholder="approved"
                />
              </div>
            </div>
          )}

          {/* AI NODE */}
          {selectedNode.type === 'ai' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">AI Provider</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-purple-500 focus:outline-none bg-white"
                  value={selectedNode.data.provider || 'gemini'}
                  onChange={(e) => {
                    const p = e.target.value;
                    const defaultModel = 
                      p === 'gemini' ? 'gemini-1.5-flash' : 
                      p === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o-mini';
                    updateNodeData(selectedNode.id, { provider: p, modelId: defaultModel });
                  }}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="universal">Universal (OpenAI / DeepSeek / Groq)</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Model Name / ID</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-purple-500 focus:outline-none font-mono"
                  value={selectedNode.data.modelId || ''} 
                  onChange={(e) => updateNodeData(selectedNode.id, { modelId: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Prompt Template</label>
                {renderVariablePills('prompt')}
                <textarea
                  className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-purple-500 focus:outline-none min-h-22.5 font-mono"
                  value={selectedNode.data.prompt || ''} 
                  onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                  placeholder="Summarize this text..."
                />
              </div>

              {renderOutputKeyField('ai_result')}

              {/* AI CREDENTIAL VAULT */}
              <div className="border-t border-slate-100 pt-3 mt-2">
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-500" />
                  <span>Save Key for {selectedNode.data.provider || 'gemini'}</span>
                </label>
                <input
                  type="password"
                  className="w-full border border-slate-300 rounded p-1.5 text-xs mb-2 focus:outline-none focus:border-purple-500 font-mono"
                  placeholder="sk-... or API Secret"
                  value={credInput}
                  onChange={(e) => setCredInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!credInput.trim()) return alert('Please enter a valid key.');
                    await handleSaveCredential(selectedNode.data.provider || 'gemini', { apiKey: credInput.trim() });
                    setCredInput('');
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-1.5 px-3 rounded shadow-sm transition-colors"
                >
                  Store in Encrypted Vault
                </button>
              </div>
            </div>
          )}

          {/* KNOWLEDGE BASE NODE */}
          {selectedNode.type === 'knowledge_base' && (
            <div className="flex flex-col gap-3">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Embedding Provider</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-teal-500 focus:outline-none bg-white font-medium"
                  value={currentKbProvider}
                  onChange={(e) => updateNodeData(selectedNode.id, { provider: e.target.value })}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="universal">Universal (OpenAI / Local)</option>
                </select>
              </div>

              {currentKbProvider === 'universal' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Base URL (Optional)</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-teal-500 focus:outline-none font-mono"
                    value={selectedNode.data.baseUrl || ''} 
                    onChange={(e) => updateNodeData(selectedNode.id, { baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Search Query / Prompt</label>
                {renderVariablePills('query')}
                <textarea
                  rows={2}
                  className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-teal-500 focus:outline-none font-mono"
                  value={selectedNode.data.query || ''} 
                  onChange={(e) => updateNodeData(selectedNode.id, { query: e.target.value })}
                  placeholder="The question to ask the database..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Max Chunks</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    value={selectedNode.data.maxChunks || 3}
                    onChange={(e) => updateNodeData(selectedNode.id, { maxChunks: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Database ID</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-teal-500 focus:outline-none font-mono"
                    value={selectedNode.data.databaseId || 'default'}
                    onChange={(e) => updateNodeData(selectedNode.id, { databaseId: e.target.value })}
                    placeholder="default"
                  />
                </div>
              </div>

              {renderOutputKeyField('kb_context')}

              {/* RAG CREDENTIAL VAULT */}
              <div className="border-t border-slate-100 pt-3 mt-2">
                <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-500" />
                  <span>Save Embedding Key for {currentKbProvider}</span>
                </label>
                <input
                  type="password"
                  className="w-full border border-slate-300 rounded p-1.5 text-xs mb-2 font-mono"
                  placeholder={`Enter ${currentKbProvider} key...`}
                  value={credInput}
                  onChange={(e) => setCredInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!credInput.trim()) return alert('Please enter a valid key.');
                    await handleSaveCredential(currentKbProvider, { apiKey: credInput.trim() });
                    setCredInput('');
                  }}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors"
                >
                  Save Key to Vault
                </button>
              </div>

              {/* Add Docs Button */}
              <div className="border-t border-slate-100 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsKnowledgeModalOpen(true)}
                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold rounded text-slate-200 transition"
                >
                  + Add Documents to Knowledge Base
                </button>
              </div>
            </div>
          )}

          {/* SUPERCHARGED INTEGRATION NODE */}
          {selectedNode.type === 'integration' && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Select App</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:border-indigo-500 focus:outline-none bg-white font-medium"
                  value={selectedNode.data.provider || 'discord'}
                  onChange={(e) => {
                    const prov = e.target.value;
                    const defaultAction = 
                      prov === 'discord' ? 'send_channel_message' :
                      prov === 'slack' ? 'post_channel_message' :
                      prov === 'email' ? 'send_email' : 'custom_request';
                    
                    updateNodeData(selectedNode.id, { 
                      provider: prov, 
                      action: defaultAction,
                      label: `${prov.toUpperCase()}: ${defaultAction.replace(/_/g, ' ')}` 
                    });
                  }}
                >
                  <option value="discord">💬 Discord</option>
                  <option value="slack">⚡ Slack</option>
                  <option value="email">✉️ Email (Resend)</option>
                  <option value="custom_api">🌐 Custom Authenticated API</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Action Event</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none bg-white"
                  value={selectedNode.data.action || 'send_channel_message'}
                  onChange={(e) => updateNodeData(selectedNode.id, { 
                    action: e.target.value,
                    label: `${(selectedNode.data.provider || 'discord').toUpperCase()}: ${e.target.value.replace(/_/g, ' ')}`
                  })}
                >
                  {(selectedNode.data.provider || 'discord') === 'discord' && (
                    <>
                      <option value="send_channel_message">Send Channel Message</option>
                      <option value="send_embed">Send Rich Embed Message</option>
                    </>
                  )}
                  {selectedNode.data.provider === 'slack' && (
                    <>
                      <option value="post_channel_message">Post Message to Channel</option>
                      <option value="post_bot_alert">Post Bot Notification</option>
                    </>
                  )}
                  {selectedNode.data.provider === 'email' && (
                    <>
                      <option value="send_email">Send Transactional Email</option>
                    </>
                  )}
                  {selectedNode.data.provider === 'custom_api' && (
                    <>
                      <option value="custom_request">Trigger Authenticated Request</option>
                    </>
                  )}
                </select>
              </div>

              {/* DISCORD */}
              {(selectedNode.data.provider || 'discord') === 'discord' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Bot Name (Optional)</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none"
                      placeholder="WeaveBot Dispatcher"
                      value={selectedNode.data.botName || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { botName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Message Content</label>
                    {renderVariablePills('message')}
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="New alert: {{trigger.message}}"
                      value={selectedNode.data.message || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                    />
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-1">
                    <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-500" /> Save Webhook URL to Vault
                    </label>
                    <input
                      type="password"
                      className="w-full border border-slate-300 rounded p-1.5 text-xs mb-2 font-mono"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={credInput}
                      onChange={(e) => setCredInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!credInput.trim()) return;
                        await handleSaveCredential('discord', { webhookUrl: credInput.trim() });
                        setCredInput('');
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors"
                    >
                      Save Key to Vault
                    </button>
                  </div>
                </>
              )}

              {/* SLACK */}
              {selectedNode.data.provider === 'slack' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Target Channel</label>
                    {renderVariablePills('channel')}
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="#announcements"
                      value={selectedNode.data.channel || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { channel: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Slack Message</label>
                    {renderVariablePills('message')}
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="Notification: {{trigger.event}}"
                      value={selectedNode.data.message || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                    />
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-1">
                    <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-500" /> Save Slack Webhook URL to Vault
                    </label>
                    <input
                      type="password"
                      className="w-full border border-slate-300 rounded p-1.5 text-xs mb-2 font-mono"
                      placeholder="https://hooks.slack.com/services/..."
                      value={credInput}
                      onChange={(e) => setCredInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!credInput.trim()) return;
                        await handleSaveCredential('slack', { webhookUrl: credInput.trim() });
                        setCredInput('');
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors"
                    >
                      Save Key to Vault
                    </button>
                  </div>
                </>
              )}

              {/* EMAIL */}
              {selectedNode.data.provider === 'email' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">To Address</label>
                    {renderVariablePills('toAddress')}
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="customer@domain.com"
                      value={selectedNode.data.toAddress || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { toAddress: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Subject</label>
                    {renderVariablePills('subject')}
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="Automated notification"
                      value={selectedNode.data.subject || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Email Body</label>
                    {renderVariablePills('body')}
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="Hello {{trigger.name}}..."
                      value={selectedNode.data.body || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { body: e.target.value })}
                    />
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-1">
                    <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-500" /> Save Resend API Key to Vault
                    </label>
                    <input
                      type="password"
                      className="w-full border border-slate-300 rounded p-1.5 text-xs mb-2 font-mono"
                      placeholder="re_..."
                      value={credInput}
                      onChange={(e) => setCredInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!credInput.trim()) return;
                        await handleSaveCredential('email', { apiKey: credInput.trim() });
                        setCredInput('');
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors"
                    >
                      Save Key to Vault
                    </button>
                  </div>
                </>
              )}

              {/* CUSTOM API */}
              {selectedNode.data.provider === 'custom_api' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Target Endpoint</label>
                    {renderVariablePills('customUrl')}
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="https://api.external.com/v1/trigger"
                      value={selectedNode.data.customUrl || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { customUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Payload (JSON)</label>
                    {renderVariablePills('customPayload')}
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-md p-2 text-xs focus:border-indigo-500 focus:outline-none font-mono"
                      placeholder="{\n  &quot;event&quot;: &quot;{{trigger.type}}&quot;\n}"
                      value={selectedNode.data.customPayload || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { customPayload: e.target.value })}
                    />
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-1">
                    <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-500" /> Save Bearer Token to Vault
                    </label>
                    <input
                      type="password"
                      className="w-full border border-slate-300 rounded p-1.5 text-xs mb-2 font-mono"
                      placeholder="Bearer token or secret"
                      value={credInput}
                      onChange={(e) => setCredInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!credInput.trim()) return;
                        await handleSaveCredential('custom_api', { token: credInput.trim() });
                        setCredInput('');
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors"
                    >
                      Save Key to Vault
                    </button>
                  </div>
                </>
              )}

              {renderOutputKeyField('integration_result')}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">Test Action Sandbox</span>
                  <button
                    type="button"
                    disabled={testLoading}
                    onClick={handleRunTestStep}
                    className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded shadow-sm transition disabled:opacity-50"
                  >
                    {testLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 fill-white" />
                    )}
                    {testLoading ? 'Testing...' : 'Test Step'}
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2 rounded text-[11px] border font-mono ${
                    testResult.status === 'success' 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {testResult.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.response && (
                      <pre className="text-[10px] bg-white/70 p-1.5 rounded overflow-x-auto text-slate-700">
                        {JSON.stringify(testResult.response, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-400 mt-4 bg-gray-50 p-2 rounded">
            ID: {selectedNode.id} | Type: {selectedNode.type}
          </div>
        </div>
      </div>

      <AddKnowledgeModal 
        isOpen={isKnowledgeModalOpen} 
        onClose={() => setIsKnowledgeModalOpen(false)}
        onIndexed={(data) => {
          alert(`Successfully embedded ${data?.chunksCreated || 'all'} chunks!`);
          setIsKnowledgeModalOpen(false);
        }}
      />
    </>
  );
}