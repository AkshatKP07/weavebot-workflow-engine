import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

export default function ActionNode({ data, selected }) {
  const method = data?.method || 'POST';
  const outputKey = data?.outputKey || 'http_response';

  return (
    <div
      className={`min-w-45max-w-55 bg-white rounded-xl shadow-sm border-2 px-3.5 py-2.5 transition-all cursor-pointer ${
        selected ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full -left-1.5" />

      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <h4 className="font-semibold text-xs text-slate-800 truncate">HTTP Request</h4>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded">{method}</span>
            <p className="text-[10px] text-slate-400 truncate font-mono">Custom API</p>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Output:</span>
        <code className="bg-slate-50 px-1 py-0.5 rounded text-blue-600 font-mono">{outputKey}</code>
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full -right-1.5" />
    </div>
  );
}