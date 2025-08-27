import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { TypeBoxModel, Property, TypeKind } from '../../types/TypeSchema';
import { useSchema } from '../../App';
import { propertyTypeToLabel } from './typeUtils';

interface TypeBoxProps {
  data: TypeBoxModel;
  selected: boolean;
  onDrag: (id: string, x: number, y: number) => void;
  onSelect: (id: string, e: React.MouseEvent) => void; // ctrl/meta additive selection 지원
}


const TypeBox: React.FC<TypeBoxProps> = ({ data, selected, onDrag, onSelect }) => {
  const schema = useSchema();
  const ref = useRef<HTMLDivElement | null>(null);
  const dragInfo = useRef<{ dx: number; dy: number; startX: number; startY: number } | null>(null);
  const [, force] = useState(0);
  const [kindOpen, setKindOpen] = useState(false);
  const [expandedProp, setExpandedProp] = useState<string | null>(null);
  // property editing moved to InspectorPanel
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [typeString, setTypeString] = useState<Record<string, string>>({});

  // 선택 변경 시 UI 패널 닫기
  useEffect(() => {
    setKindOpen(false);
    setExpandedProp(null);
  }, [selected]);

  useEffect(() => {
    const newTypeString: Record<string, string> = {};
    data.properties.forEach(p => {
      newTypeString[p.id] = propertyTypeToLabel(p.type as any);
    });
    setTypeString(newTypeString);
  }, [data.properties]);

  // Delete 키 제거 로직은 Canvas에서 다중 선택과 함께 처리

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragInfo.current) return;
    const nx = e.clientX - dragInfo.current.dx;
    const ny = e.clientY - dragInfo.current.dy;
    onDrag(data.id, nx, ny);
  }, [onDrag, data.id]);

  const handleMouseUp = useCallback(() => {
    dragInfo.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    force(x => x + 1);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // 좌클릭만
    e.stopPropagation();
    if (!selected)
      onSelect(data.id, e);

    const target = e.target as HTMLElement;
    if (target.closest('input,textarea,button,select,[contenteditable="true"],label') && selected) return;

    const rect = ref.current?.getBoundingClientRect();
    dragInfo.current = {
      dx: e.clientX - (rect?.left || 0),
      dy: e.clientY - (rect?.top || 0),
      startX: data.position.x,
      startY: data.position.y
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [data.id, data.position.x, data.position.y, onSelect, handleMouseMove, handleMouseUp]);


  const border = selected ? 'border-slate-700 ring-2 ring-slate-300' : 'border-slate-200 hover:border-slate-300';

  const commitProp = (id: string, partial: Partial<Property>) => {
    const updated = data.properties.map(p => p.id === id ? { ...p, ...partial } : p);
    schema.updateBox(data.id, { properties: updated });
  };

  const handlePropNameChange = (id: string, value: string) => {
    commitProp(id, { name: value });
  };

  const addProperty = () => {
    const newProp: Property = { id: Math.random().toString(36).slice(2), name: 'field', type: { kind: 'primitive', name: 'string' } };
    const updated = [...data.properties, newProp];
    schema.updateBox(data.id, { properties: updated });
    setExpandedProp(newProp.id);
  };

  const toggleOptional = (id: string) => commitProp(id, { optional: !data.properties.find(p => p.id === id)?.optional });
  // readonly toggle handled in InspectorPanel

  const changeKind = (k: TypeKind) => {
    schema.updateBox(data.id, { kind: k });
    setKindOpen(false);
  };

  // custom types handled in InspectorPanel

  const handleKindButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setKindOpen(o => !o);
    setExpandedProp(null);
  };
  const handleTypeButtonClick = (isExpanded: boolean, propId: string) => {
    setExpandedProp(isExpanded ? null : propId);
    setKindOpen(false);
  };

  // moved helpers to InspectorPanel

  // (기본|커스텀) 타입 버튼 클릭 공통 처리
  // type selection handled in InspectorPanel

  // type build handled in InspectorPanel

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className={`absolute bg-slate-50/80 backdrop-blur rounded-xl shadow-lg border ${border} cursor-move select-none px-6 pt-5.5 pb-6.5 transition flex flex-col items-center`}
      style={{ left: data.position.x, top: data.position.y, minWidth: 200, zIndex: selected ? 30 : 10 }}
    >
      <button
        className={`absolute -top-3.5 w-7 h-7 rounded-full bg-slate-50 border border-slate-300 text-slate-600 hover:bg-red-400 hover:text-slate-50 hover:border-slate-200 transition-all shadow font-mono  ${selected ? 'opacity-100' : 'opacity-0 hidden'}`}
        onClick={(e) => {
          e.stopPropagation();
          schema.removeBox(data.id);
        }}
        title="타입 삭제"
        style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.05)' }}
      >-</button>
      <div className="flex w-full items-center ml-0.5 mb-4.5 gap-2
      ">
        <input
          value={data.name}
          onChange={e => schema.updateBox(data.id, { name: e.target.value })}
          className="text-2xl font-mono font-bold tracking-tight text-slate-700 bg-transparent border-b border-transparent focus:border-slate-400 focus:outline-none px-0.5"
          style={{ width: `${Math.max(data.name.length, 2) + 0.3}ch` }}
        />
        <div className="relative shrink-0">
          <button onClick={(e) => handleKindButtonClick(e)} className="text-base px-2.5 pt-[2.7px] pb-[5px] rounded-full bg-slate-500 text-white font-mono capitalize hover:bg-slate-600 whitespace-nowrap shadow transition-colors"
            style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.10)' }}
          >{data.kind}</button>
          {kindOpen && (
            <div className="absolute z-20 mt-1 left-0 w-32 rounded-lg border border-slate-200 bg-white shadow p-1 flex flex-col text-sm">
              {['interface', 'type', 'enum', 'alias'].map(k => (
                <button key={k} onClick={() => changeKind(k as TypeKind)} className="text-left px-2 py-1 rounded hover:bg-slate-100 capitalize">
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <ul className=" w-full space-y-4">
        {data.properties.map(p => {
          const isExpanded = expandedProp === p.id;
          const isSelectedProp = schema.propertySelection === p.id;
          // setTypeString(prev => ({ ...prev, [p.id]: propertyTypeToLabel(p.type as any) }));
          return (
            <div key={p.id}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative flex w-full items-center"
              onClick={(e) => { e.stopPropagation(); schema.selectProperty && schema.selectProperty(p.id); }}>
              <div className={`relative w-fit flex items-center px-4 py-1.5 rounded-full border ${isSelectedProp ? 'border-slate-300 ring-2 ring-slate-300' : 'border-slate-200'} bg-white text-xs font-mono transition-shadow`}
                style={{ boxShadow: isSelectedProp ? '0 0px 8px rgba(60,60,100,0.3)' : '0 0px 8px rgba(60,60,100,0.05)' }}
              >
                <div className='group'>
                  {(p.optional || selected) && (
                    <button onClick={() => toggleOptional(p.id)} className={`absolute -left-2.5 -top-1.5 text-sm px-2 py-0.5 rounded-full transition-all ${p.optional ? 'opacity-100 bg-slate-400 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} shadow ${hoveredId === p.id ? 'opacity-100' : 'opacity-0'}`}>?
                    </button>
                  )}
                  <span className="z-50 absolute -bottom-2 left-0 -translate-x-1/2 px-2 py-1 rounded bg-black text-white text-sm opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-opacity group-hover:delay-1000 whitespace-nowrap">
                    Optional property
                  </span>
                </div>
                <input
                  value={p.name}
                  onChange={e => handlePropNameChange(p.id, e.target.value)}
                  className="bg-transparent text-lg font-mono font-normal border-b border-transparent focus:border-slate-400 focus:outline-none mx-1"
                  style={{ width: `${Math.max(p.name.length, 2) + 0.3}ch` }}
                />
                <div className='relative overflow-visible'>
                  <button
                    onClick={() => handleTypeButtonClick(isExpanded, p.id)}
                    className="absolute left-0 -top-2 text-sm pl-2 pr-2.5 py-1 -tracking-wider rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 shadow whitespace-nowrap border border-slate-400/40 transition-all"
                    style={{ boxShadow: isSelectedProp ? '0 0px 8px rgba(60,60,100,0.3)' : '0 0px 8px rgba(60,60,100,0.05)' }}
                  >
                    {typeString[p.id]}
                  </button>
                </div>
              </div>
              {/* Inspector 로 이동됨 */}
              <span className="text-transparent font-mono mr-4">
                    {typeString[p.id]}</span>
              {selected && (
                <button
                  className={`absolute -right-2.5 w-6 h-6 flex items-center justify-center rounded-full border border-slate-200 bg-red-300 text-slate-100 hover:bg-red-500 transition-all shadow font-mono  ${hoveredId === p.id ? '' : 'opacity-0'}`}
                  onClick={() => {
                    const updated = data.properties.filter(prop => prop.id !== p.id);
                    schema.updateBox(data.id, { properties: updated });
                  }}
                  title="속성 삭제"
                  style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.05)' }}
                >-</button>
              )}
            </div>
          );
        })}
        <div className='flex justify-between'>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all shadow"
            title="속성 추가"
            onClick={(e) => { e.stopPropagation(); addProperty(); }}
            style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.05)' }}
          >+
          </button>
          {/* <button
            className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all shadow"
            title="속성 추가"
            onClick={(e) => { e.stopPropagation(); addProperty(); }}
            style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.05)' }}
          >+
          </button> */}
        </div>
      </ul>
    </div>
  );
};

// 메모 비교: property 개수 + 각 name/optional 변경 추적
export default React.memo(TypeBox, (a, b) => {
  if (a.selected !== b.selected) return false;
  if (a.data.position.x !== b.data.position.x || a.data.position.y !== b.data.position.y) return false;
  if (a.data.name !== b.data.name) return false;
  if (a.data.kind !== b.data.kind) return false;
  const ap = a.data.properties; const bp = b.data.properties;
  if (ap !== bp) return false;
  for (let i = 0; i < ap.length; i++) {
    const p1 = ap[i]; const p2 = bp[i];
    if (p1.id !== p2.id || p1.name !== p2.name || !!p1.optional !== !!p2.optional) return false;
  }
  return true;
});
