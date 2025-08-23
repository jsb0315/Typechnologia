import React, { useEffect, useCallback } from 'react';
import { useSchema } from '../../App';
import TypeBox from './TypeBox';

const Canvas: React.FC = () => {
  const schema = useSchema();

  const handleBackgroundClick = useCallback(() => schema.select(null), [schema]);

  // N 키로 타입 추가
  useEffect(() => {
    const isEditing = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
      if (el.isContentEditable) return true;
      if (el.getAttribute('role') === 'textbox') return true;
      return false;
    };
    const handler = (e: KeyboardEvent) => {
      if (isEditing()) return; // 입력 중에는 단축키 무시
      if (e.key === 'n' || e.key === 'N') {
        schema.addType();
      } else if (e.key === 'Escape') {
        schema.select(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [schema]);

  return (
    <div className="w-full h-full relative select-none" onMouseDown={handleBackgroundClick}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#e2e8f0_1px,transparent_0)] [background-size:32px_32px]" />
      <div className="absolute top-5 left-6 z-10 px-4 py-2 rounded-xl bg-white/80 backdrop-blur border border-slate-200 shadow-lg text-sm font-semibold tracking-tight text-slate-700">
        TypeScript 타입 & 인터페이스 매니저
      </div>
      {schema.order.map(id => {
        const box = schema.boxes[id];
        return (
          <TypeBox
            key={id}
            data={box}
            selected={schema.selection === id}
            onDrag={schema.updatePosition}
            onSelect={schema.select}
          />
        );
      })}
    </div>
  );
};

export default Canvas;
