import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';

export default function TriggerNode({ data }) {
  return (
    <div className="bg-white border-2 border-green-500 rounded-xl p-4 shadow-lg w-64">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-green-100 p-2 rounded-lg">
          <Play className="text-green-600 w-5 h-5" />
        </div>
        <div className="font-bold text-gray-800 text-sm">Webhook Trigger</div>
      </div>
      
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
        {data.label || 'Waiting for event...'}
      </div>

      {/* This creates the connection dot on the right side */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-green-500 border-2 border-white" 
      />
    </div>
  );
}