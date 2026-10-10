import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Mail, Webhook, Hash, Database } from 'lucide-react';

const PROVIDER_METADATA = {
  discord: { label: 'Discord', icon: MessageSquare, color: 'text-[#5865F2]', bg: 'bg-[#5865F2]/10', border: 'border-[#5865F2]' },
  slack: { label: 'Slack', icon: Hash, color: 'text-[#E01E5A]', bg: 'bg-[#E01E5A]/10', border: 'border-[#E01E5A]' },
  email: { label: 'Resend Email', icon: Mail, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
  sheets: { label: 'Google Sheets', icon: Database, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500' },
  custom: { label: 'Custom API', icon: Webhook, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-400' }
};

export default function IntegrationNode({ data, selected }) {
  const providerKey = data?.provider || 'discord';
  const meta = PROVIDER_METADATA[providerKey] || PROVIDER_METADATA.custom;
  const Icon = meta.icon;
  const actionLabel = data?.action || 'Send Message';
  const outputKey = data?.outputKey || 'integration_result';

  return (
    <div
      className={`min-w-45 max-w-55 bg-white rounded-xl shadow-sm border-2 px-3.5 py-2.5 transition-all cursor-pointer ${
        selected ? `${meta.border} ring-2 ring-indigo-100 shadow-md` : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-indigo-500 border-2 border-white rounded-full -left-1.5" />

      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-lg shrink-0 ${meta.bg} ${meta.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <h4 className="font-semibold text-xs text-slate-800 truncate">{meta.label}</h4>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{actionLabel}</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Output:</span>
        <code className="bg-slate-50 px-1 py-0.5 rounded text-indigo-600 font-mono">{outputKey}</code>
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-indigo-500 border-2 border-white rounded-full -right-1.5" />
    </div>
  );
}