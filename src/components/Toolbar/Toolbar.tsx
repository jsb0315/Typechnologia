import React from 'react';
import { useSchemaActions } from '../../App';

  // 전역 SchemaContext 사용
  const Toolbar: React.FC = () => {
  const actions = useSchemaActions();
  return (
    <div className="w-full flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-2"
    style={{ boxShadow: '0 2px 8px rgba(135,135,135,0.15)' }}>
        <button onClick={() => actions.addType()} className="h-9 px-4 rounded-xl bg-slate-800 text-white text-sm font-medium shadow hover:bg-slate-950 active:scale-[.97] transition">+ Type</button>
        <button onClick={() => console.log('EXPORT_GRAPH')} className="h-9 px-4 rounded-xl bg-slate-500 text-white text-sm font-medium shadow hover:bg-slate-600 active:scale-[.97] transition">Export</button>
      <div className="flex-1" />
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <kbd className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 font-medium">N</kbd>
        <span className="text-slate-400">New Type</span>
        <kbd className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 font-medium ml-3">E</kbd>
        <span className="text-slate-400">Export</span>
      </div>
    </div>
  );
};

export default Toolbar;
