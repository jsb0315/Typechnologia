import React from 'react';
import { useSchema } from '../../App';

  // 전역 SchemaContext 사용
  const Toolbar: React.FC = () => {
    const schema = useSchema();
    console.log('Toolbar loaded');
  return (
    <div className="sticky top-0 z-40 w-full px-4 pt-4">
      <div className="w-full flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_2px_4px_-1px_rgba(0,0,0,0.06)] p-2">
          <button onClick={() => schema.addType()} className="h-9 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium shadow hover:bg-slate-800 active:scale-[.97] transition">+ 타입 (N)</button>
          <button onClick={() => console.log('EXPORT_GRAPH', schema)} className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 active:scale-[.97] transition">Export (E)</button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <kbd className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 font-medium">N</kbd>
          <span className="text-slate-400">새 타입</span>
          <kbd className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 font-medium ml-3">E</kbd>
          <span className="text-slate-400">Export</span>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
