import React from 'react';

const FloatingTutorial: React.FC = () => {
  console.log('FloatingTutorial loaded');
  return (
    <div className="fixed left-6 bottom-6 max-w-xs rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-4 z-50">
      <div className="font-semibold text-slate-700 mb-2">단축키 튜토리얼</div>
      <ul className="space-y-2 text-xs text-slate-600">
        <li><span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">N</span> 새 타입 추가</li>
        <li><span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Del</span> 삭제</li>
        <li><span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">E</span> Export</li>
        <li><span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Cmd+I</span> Import Drawer</li>
        <li><span className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Cmd+O</span> Export Drawer</li>
      </ul>
      {/* TODO: 포커스 컨텍스트별 동적 안내 */}
    </div>
  );
};

export default FloatingTutorial;
