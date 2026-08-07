import { Handle, Position } from '@xyflow/react';
import { Database } from 'lucide-react';

export default function KnowledgeBaseNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-white border-2 ${selected ? 'border-teal-500' : 'border-teal-200'} w-64`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-teal-500 border-2 border-white" />
      
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-lg p-2 bg-teal-100 text-teal-600">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-800">Knowledge Base</div>
          <div className="text-xs text-gray-500 truncate">{data.label || 'Select Database'}</div>
        </div>
      </div>

      {/* Mini preview of RAG settings */}
      <div className="flex gap-2 mt-2">
        <div className="bg-slate-50 text-[10px] text-slate-500 px-2 py-1 rounded border border-slate-200">
          Chunks: {data.maxChunks || 5}
        </div>
        <div className="bg-slate-50 text-[10px] text-slate-500 px-2 py-1 rounded border border-slate-200">
          Size: {data.chunkSize || 1000}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-teal-500 border-2 border-white" />
    </div>
  );
}