import { Handle, Position } from '@xyflow/react'; // Change to 'reactflow' if using v11
import { Bot, Sparkles } from 'lucide-react';

export default function AiNode({ data, selected }) {
  const provider = data?.provider || 'Google Gemini';
  const modelId = data?.modelId || 'gemini-1.5-flash';
  const outputKey = data?.outputKey || 'ai_result';

  return (
    <div
      className={`min-w-45 max-w-55 bg-white rounded-xl shadow-sm border-2 px-3.5 py-2.5 transition-all cursor-pointer ${
        selected
          ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-md'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-indigo-500 border-2 border-white rounded-full -left-1.5"
      />

      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1">
            <h4 className="font-semibold text-xs text-slate-800 truncate">AI Task</h4>
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          </div>
          <p className="text-[10px] text-slate-400 truncate capitalize">
            {provider} · {modelId}
          </p>
        </div>
      </div>

      {/* Output preview tag */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Output:</span>
        <code className="bg-slate-50 px-1 py-0.5 rounded text-indigo-600 font-mono">
          {outputKey}
        </code>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-indigo-500 border-2 border-white rounded-full -right-1.5"
      />
    </div>
  );
}