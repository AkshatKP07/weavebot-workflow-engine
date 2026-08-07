import { Handle, Position } from '@xyflow/react';

export default function FilterNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 shadow-md rounded-md bg-white border-2 ${selected ? 'border-orange-500' : 'border-orange-200'}`}>
      {/* Top Handle: Receives Data */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-400" />
      
      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-orange-100 text-orange-600 mr-2">
          {/* A simple filter/funnel icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold text-gray-800">Logic Filter</div>
          <div className="text-xs text-gray-500">{data.label || 'Configure Condition'}</div>
        </div>
      </div>

      {/* Bottom Handle: Passes Data Forward */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-400" />
    </div>
  );
}