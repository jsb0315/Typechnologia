import React, { useEffect, useCallback } from 'react';
import { useSchemaState, useSchemaActions } from '../../App';
import TypeBox from './TypeBox';

const Canvas: React.FC = () => {
  const state = useSchemaState();
  const actions = useSchemaActions();

  // 배경 클릭 시만 선택 해제 (버튼/입력 요소 제외)
  const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, textarea, input, [contenteditable="true"]')) return; // 인터랙티브 요소 클릭은 무시
    actions.select(null);
  }, [actions]);

  const handleSelectBox = useCallback((id: string, e: React.MouseEvent) => {
    const additive = e.ctrlKey || e.metaKey; // ctrl(Mac meta) + click
    actions.select(id, { additive });
  }, [actions]);

  // 키보드 단축키: N 새 타입 / ESC 선택 해제 / Delete 선택 모두 삭제
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
        actions.addType();
      } else if (e.key === 'Escape') {
        actions.select(null);
      } else if (e.key === 'Delete') {
        if (state.selection.length) {
          actions.removeBoxes(state.selection);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.selection, actions]);

  return (
    <div className="w-full h-full relative select-none" onMouseDown={handleBackgroundMouseDown}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#e2e8f0_1px,transparent_0)] [background-size:32px_32px]" />
      {state.order.map(id => {
        const box = state.boxes[id];
        const selected = state.selection.includes(id);
        return (
          <TypeBox
            key={id}
            data={box}
            selected={selected}
            onDrag={actions.updatePosition}
            onSelect={(bid: string, e) => handleSelectBox(bid, e)}
          />
        );
      })}
    </div>
  );
};

export default Canvas;
