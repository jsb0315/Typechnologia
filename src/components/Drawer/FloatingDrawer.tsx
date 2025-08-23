import React from 'react';

const FloatingDrawer: React.FC = () => {
  console.log('FloatingDrawer loaded');
  return (
    <div className="fixed right-6 top-28 w-80 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-5 z-50 space-y-3">
      <div className="font-semibold text-slate-700">Import / Export Hub</div>
      <button className="w-full h-10 text-sm rounded-xl bg-slate-900 text-white font-medium shadow hover:bg-slate-800 active:scale-[.97] transition">Import JSON / TS</button>
      <button className="w-full h-10 text-sm rounded-xl bg-indigo-600 text-white font-medium shadow hover:bg-indigo-500 active:scale-[.97] transition">Export JSON / TS</button>
      <div className="pt-2 border-t border-slate-200 text-xs text-slate-500">Snapshot / Drag & Drop 예정</div>
    </div>
  );
};

export default FloatingDrawer;
