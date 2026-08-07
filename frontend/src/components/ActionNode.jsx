import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

export default function ActionNode({ data }) {
  return (
    <div className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-lg w-64">
      {/* Input Handle (Left side) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-blue-500 border-2 border-white" 
      />

      <div className="flex items-center gap-3 mb-2">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Zap className="text-blue-600 w-5 h-5" />
        </div>
        <div className="font-bold text-gray-800 text-sm">HTTP Request</div>
      </div>
      
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
        {data.label || 'GET https://api.example.com'}
      </div>

      {/* Output Handle (Right side) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-blue-500 border-2 border-white" 
      />
    </div>
  );
}