import { Handle, Position } from '@xyflow/react';
import { Database } from 'lucide-react';

export default function KnowledgeBaseNode({ data, selected }) {
  const databaseId = data?.databaseId || 'mock_db';
  const outputKey = data?.outputKey || 'kb_context';

  return (
    <div
      className={`min-w-45 max-w-55 bg-white rounded-xl shadow-sm border-2 px-3.5 py-2.5 transition-all cursor-pointer ${
        selected ? 'border-teal-500 ring-2 ring-teal-100 shadow-md' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-teal-500 border-2 border-white rounded-full -left-1.5" />

      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg shrink-0">
          <Database className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <h4 className="font-semibold text-xs text-slate-800 truncate">Knowledge Base</h4>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">Search: {databaseId}</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Output:</span>
        <code className="bg-slate-50 px-1 py-0.5 rounded text-teal-600 font-mono">{outputKey}</code>
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-teal-500 border-2 border-white rounded-full -right-1.5" />
    </div>
  );
}