import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

export default function AddKnowledgeModal({ isOpen, onClose, onIndexed }) {
  const { getToken } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [databaseId] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch('http://localhost:3001/api/knowledge/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, content, databaseId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setTitle('');
      setContent('');
      if (onIndexed) onIndexed(data);
      onClose();
    } catch (err) {
      setError(err.message);
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
    reader.readAsText(file); // Reads .txt, .md, .csv, or raw text files
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
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Import from File (.txt, .md)
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
              rows={6}
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