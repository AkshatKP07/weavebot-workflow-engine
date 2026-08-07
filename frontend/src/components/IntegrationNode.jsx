import { Handle, Position } from '@xyflow/react';
import { Plug } from 'lucide-react';

export default function IntegrationNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-white border-2 ${selected ? 'border-indigo-600' : 'border-indigo-300'} w-64`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-indigo-500 border-2 border-white" 
      />

      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2 bg-indigo-100 text-indigo-600">
          <Plug className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-800">
            {data.provider ? data.provider.toUpperCase() : 'Integration'}
          </div>
          <div className="text-xs text-gray-500 truncate max-w-140px">
            {data.label || 'Configure Provider'}
          </div>
        </div>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-indigo-500 border-2 border-white" 
      />
    </div>
  );
}