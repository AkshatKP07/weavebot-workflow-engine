import { useState } from 'react';
import { apiClient } from '../../api/client';

export default function AddKnowledgeModal({ isOpen, onClose, onIndexed }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [databaseId, setDatabaseId] = useState('default');
  const [provider, setProvider] = useState('gemini');
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.indexKnowledgeDocument({
        title,
        content,
        databaseId,
        provider,
        baseUrl: provider === 'universal' ? baseUrl : undefined
      });

      setTitle('');
      setContent('');
      if (onIndexed) onIndexed(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to index document.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setTitle(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => setContent(event.target.result);
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-white shadow-xl">
        <h2 className="text-xl font-bold mb-4">Add Knowledge Base Data</h2>

        {error && (
          <div className="p-3 mb-4 text-sm bg-red-950/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Embedding Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini">Google Gemini</option>
                <option value="universal">Universal (OpenAI / Local)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Target Database ID
              </label>
              <input
                type="text"
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
                placeholder="default"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {provider === 'universal' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Base URL (Optional)
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Import from File (.txt, .md, .csv)
            </label>
            <input
              type="file"
              accept=".txt,.md,.json,.csv"
              onChange={handleFileUpload}
              className="text-sm text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Document Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Return Policy, Pricing FAQ"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Document Text / Context
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste raw company info, internal docs, or guidelines here..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold rounded bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {loading ? 'Embedding & Indexing...' : 'Index Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}