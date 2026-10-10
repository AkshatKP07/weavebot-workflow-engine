import { Handle, Position } from '@xyflow/react';
import { Filter } from 'lucide-react';

export default function FilterNode({ data, selected }) {
  const condition = data?.filterKey ? `${data.filterKey} ${data.filterOperator} ${data.filterValue}` : 'No condition set';

  return (
    <div
      className={`min-w-45 max-w-55 bg-white rounded-xl shadow-sm border-2 px-3.5 py-2.5 transition-all cursor-pointer ${
        selected ? 'border-orange-500 ring-2 ring-orange-100 shadow-md' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-orange-500 border-2 border-white rounded-full -left-1.5" />

      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
          <Filter className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <h4 className="font-semibold text-xs text-slate-800 truncate">Logic Filter</h4>
          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{condition}</p>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-orange-500 border-2 border-white rounded-full -right-1.5" />
    </div>
  );
}