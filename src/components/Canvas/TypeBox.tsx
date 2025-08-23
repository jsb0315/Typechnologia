import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { TypeBoxModel, Property, TypeKind } from '../../types/TypeSchema';
import { useSchema } from '../../App';

interface TypeBoxProps {
  data: TypeBoxModel;
  selected: boolean;
  onDrag: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
}

const PRIMITIVES = ['string', 'boolean', 'null', 'number', 'any', 'unknown', 'undefined'];

const TypeBox: React.FC<TypeBoxProps> = ({ data, selected, onDrag, onSelect }) => {
  const schema = useSchema();
  const ref = useRef<HTMLDivElement | null>(null);
  const dragInfo = useRef<{ dx: number; dy: number; startX: number; startY: number } | null>(null);
  const [, force] = useState(0);
  const [draftName, setDraftName] = useState(data.name);
  const [kindOpen, setKindOpen] = useState(false);
  const [localProps, setLocalProps] = useState<Property[]>(data.properties);
  const [kindCache, setKindCache] = useState<TypeKind>(data.kind);
  const [expandedProp, setExpandedProp] = useState<string | null>(null);
  const [customTypeFilter, setCustomTypeFilter] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // data 변경 시 로컬 draft sync (선택 전환 등)
  useEffect(() => { setDraftName(data.name); setLocalProps(data.properties); }, [data.id]);

  // 선택 해제될 때 로컬 변경 사항 commit
  useEffect(() => {
    if (!selected) {
      if (draftName !== data.name || localProps !== data.properties) {
        schema.updateBox(data.id, { name: draftName, properties: localProps });
      }
      setKindOpen(false);
      setExpandedProp(null);
    }
  }, [selected]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragInfo.current) return;
    const nx = e.clientX - dragInfo.current.dx;
    const ny = e.clientY - dragInfo.current.dy - 70;
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
    onSelect(data.id);

    const target = e.target as HTMLElement;
    const isInteractive = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      const tag = el.tagName;
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'LABEL'].includes(tag)) return true;
      if (el.isContentEditable) return true;
      const role = el.getAttribute('role');
      if (role && ['button', 'textbox', 'checkbox', 'switch', 'radio', 'combobox'].includes(role)) return true;
      if (el.closest('input,textarea,button,select,[contenteditable="true"], [role="textbox"], [role="button"]')) return true;
      return false;
    };
    if (isInteractive(target)) return; // 편집/버튼 클릭 시 드래그 시작 안 함

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
    setLocalProps(list => list.map(p => p.id === id ? { ...p, ...partial } : p));
  };

  const addProperty = () => {
    const newProp: Property = { id: Math.random().toString(36).slice(2), name: 'field', type: 'string' };
    setLocalProps(l => [...l, newProp]);
    setExpandedProp(newProp.id);
  };

  const toggleOptional = (id: string) => commitProp(id, { optional: !localProps.find(p => p.id === id)?.optional });
  const toggleReadonly = (id: string) => commitProp(id, { readonly: !localProps.find(p => p.id === id)?.readonly });

  const changeKind = (k: TypeKind) => {
    schema.updateBox(data.id, { kind: k });
    setKindCache(k);
    setKindOpen(false);
  };

  const customTypes = Object.values(schema.boxes).filter(b => b.id !== data.id).map(b => b.name);
  const filteredCustomTypes = customTypes.filter(t => t.toLowerCase().includes(customTypeFilter.toLowerCase()));

  const handleKindButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setKindOpen(o => !o);
    setExpandedProp(null);
  };
  const handleTypeButtonClick = (isExpanded: boolean, propId: string) => {
    setExpandedProp(isExpanded ? null : propId);
    setKindOpen(false);
  };

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className={`absolute bg-slate-50/80 backdrop-blur rounded-xl shadow-lg border ${border} cursor-move select-none px-6 pt-5.5 pb-6.5 transition`}
      style={{ left: data.position.x, top: data.position.y, minWidth: 200, zIndex: selected ? 30 : 10 }}
    >
      <div className="flex items-center justify-between ml-0.5 mb-4.5 gap-3">
        <input
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          className="text-2xl font-mono font-bold tracking-tight text-slate-700 bg-transparent border-b border-transparent focus:border-slate-400 focus:outline-none px-0.5"
          style={{ width: `${Math.max(draftName.length, 2) + 0.3}ch` }}
        />
        <div className="relative shrink-0">
          <button onClick={(e) => handleKindButtonClick(e)} className="text-base px-2.5 pt-[2.7px] pb-[5px] rounded-full bg-slate-500 text-white font-mono capitalize hover:bg-slate-600 whitespace-nowrap shadow transition-colors"
          style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.10)'}}
          >{kindCache}</button>
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
      <ul className="space-y-4">
        {localProps.map(p => {
          const isExpanded = expandedProp === p.id;
          return (
            <div key={p.id} 
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative flex">
              <div className={`relative w-fit flex items-center px-4 py-1.5 rounded-full border border-slate-100 bg-white text-xs font-mono`}
                style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.10)' }}
              >
                <div className='group'>
                <button onClick={() => toggleOptional(p.id)} className={`absolute -left-2.5 -top-1.5 text-sm px-2 py-0.5 rounded-full transition-all ${p.optional ? 'opacity-100 bg-slate-400 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} shadow ${hoveredId === p.id ? 'opacity-100' : 'opacity-0'}`}>?
                </button>
                  <span className="z-50 absolute -bottom-2 left-0 -translate-x-1/2 px-2 py-1 rounded bg-black text-white text-sm opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-opacity group-hover:delay-1000 whitespace-nowrap">
                    Optional property
                  </span>
                  </div>
                <input
                  value={p.name}
                  onChange={e => commitProp(p.id, { name: e.target.value })}
                  className="bg-transparent text-lg font-mono font-normal border-b border-transparent focus:border-slate-400 focus:outline-none mx-1"
                  style={{ width: `${Math.max(p.name.length, 2) + 0.3}ch` }}
                />
                <div className='relative overflow-visible'>
                  <button
                    onClick={() => handleTypeButtonClick(isExpanded, p.id)}
                    className="absolute left-0 -top-2 text-sm pl-2 pr-2.5 py-1 -tracking-wider rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 shadow whitespace-nowrap border border-slate-200 transition-all"
                    style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.10)' }}
                  >
                    {p.type}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="absolute left-0 top-11 min-w-[280px] bg-white/90 backdrop-blur rounded-xl border border-slate-200 p-3 space-y-2 shadow z-30"
                style={{ boxShadow: '0 8px 32px rgba(60,60,100,0.18)' }}>
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <div className="text-base font-medium text-slate-500 ml-0.5">기본 타입</div>
                      <button onClick={() => toggleReadonly(p.id)} className={`text-sm px-2 py-0.5 rounded-full ${p.readonly ? 'bg-pink-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} shadow`}>ro</button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {PRIMITIVES.map(t => (
                        <button key={t} onClick={() => { commitProp(p.id, { type: t }); setExpandedProp(null); }} className={`font-mono px-2.5 py-1 rounded-full text-base border ${t === p.type ? 'bg-slate-600 text-white border-slate-600' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-base font-medium mb-1 text-slate-500 flex items-center gap-2">
                      <span className='flex whitespace-nowrap ml-0.5'>커스텀 타입</span>
                      <input value={customTypeFilter} onChange={e => setCustomTypeFilter(e.target.value)} placeholder="filter" className="flex-1 bg-slate-50 border border-slate-200 rounded px-1 py-0 text-base focus:outline-none focus:border-slate-400"
                      style={{ width: "70px" }} />
                    </div>
                    <div className="font-mono flex flex-wrap gap-1 max-h-24 overflow-auto pr-1 mb-4">
                      {filteredCustomTypes.map(t => (
                        <button key={t} onClick={() => { commitProp(p.id, { type: t }); setExpandedProp(null); }} className={`px-2.5 py-1 rounded-full text-base border ${t === p.type ? 'bg-slate-600 text-white border-slate-600' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>{t}</button>
                      ))}
                      {filteredCustomTypes.length === 0 && <span className="text-base text-slate-400">없음</span>}
                    </div>
                  </div>
                  <div>
                    <textarea
                      value={p.comment || ''}
                      onChange={e => commitProp(p.id, { comment: e.target.value })}
                      placeholder="주석/설명"
                      className="w-full text-base bg-slate-50 border border-slate-200 rounded p-1.5 resize-none h-18 focus:outline-none focus:border-slate-300"
                    />
                  </div>
                </div>
              )}
              <span className="text-transparent font-mono">{p.type}</span>
            </div>
          );
        })}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all shadow"
          title="속성 추가"
          onClick={(e) => { e.stopPropagation(); addProperty(); }}
          style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.10)' }}
        >+
        </button>
      </ul>
    </div>
  );
};

export default React.memo(TypeBox, (a, b) => (
  a.data.position.x === b.data.position.x &&
  a.data.position.y === b.data.position.y &&
  a.selected === b.selected &&
  a.data.name === b.data.name &&
  a.data.properties.length === b.data.properties.length
));
