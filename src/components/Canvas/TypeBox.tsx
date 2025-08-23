import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { TypeBoxModel, Property, TypeKind } from '../../types/TypeSchema';
import { useSchema } from '../../App';

interface TypeBoxProps {
  data: TypeBoxModel;
  selected: boolean;
  onDrag: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
}

const PRIMITIVES = ['string','number','boolean','null','undefined','any','unknown'];

const TypeBox: React.FC<TypeBoxProps> = ({ data, selected, onDrag, onSelect }) => {
  const schema = useSchema();
  const ref = useRef<HTMLDivElement | null>(null);
  const dragInfo = useRef<{dx:number;dy:number;startX:number;startY:number}|null>(null);
  const [, force] = useState(0);
  const [draftName, setDraftName] = useState(data.name);
  const [kindOpen, setKindOpen] = useState(false);
  const [localProps, setLocalProps] = useState<Property[]>(data.properties);
  const [kindCache, setKindCache] = useState<TypeKind>(data.kind);
  const [expandedProp, setExpandedProp] = useState<string | null>(null);
  const [customTypeFilter, setCustomTypeFilter] = useState('');

  // data 변경 시 로컬 draft sync (선택 전환 등)
  useEffect(()=>{ setDraftName(data.name); setLocalProps(data.properties); }, [data.id]);

  // 선택 해제될 때 로컬 변경 사항 commit
  useEffect(()=>{
    if(!selected){
      if(draftName !== data.name || localProps !== data.properties){
        schema.updateBox(data.id, { name: draftName, properties: localProps });
      }
      setKindOpen(false);
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
    force(x=>x+1);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // 좌클릭만
    e.stopPropagation();
    onSelect(data.id);

    const target = e.target as HTMLElement;
    const isInteractive = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      const tag = el.tagName;
      if (['INPUT','TEXTAREA','BUTTON','SELECT','LABEL'].includes(tag)) return true;
      if (el.isContentEditable) return true;
      const role = el.getAttribute('role');
      if (role && ['button','textbox','checkbox','switch','radio','combobox'].includes(role)) return true;
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


  const border = selected ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-slate-200 hover:border-slate-300';

  const commitProp = (id: string, partial: Partial<Property>) => {
    setLocalProps(list => list.map(p => p.id === id ? { ...p, ...partial } : p));
  };

  const addProperty = () => {
    const newProp: Property = { id: Math.random().toString(36).slice(2), name: 'field', type: 'string' };
    setLocalProps(l => [...l, newProp]);
    setExpandedProp(newProp.id);
  };

  const toggleOptional = (id: string) => commitProp(id, { optional: !localProps.find(p=>p.id===id)?.optional });
  const toggleReadonly = (id: string) => commitProp(id, { readonly: !localProps.find(p=>p.id===id)?.readonly });

  const changeKind = (k: TypeKind) => { 
    schema.updateBox(data.id, { kind: k });
    setKindCache(k);
    setKindOpen(false);
  };

  const customTypes = Object.values(schema.boxes).filter(b => b.id !== data.id).map(b => b.name);
  const filteredCustomTypes = customTypes.filter(t => t.toLowerCase().includes(customTypeFilter.toLowerCase()));

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className={`group absolute bg-white/90 backdrop-blur rounded-lg shadow border ${border} cursor-move select-none px-4 pt-4 pb-3 transition`}
      style={{ left: data.position.x, top: data.position.y }}
    >
      <div className="flex items-start justify-between mb-3 gap-4">
        <input
          value={draftName}
          onChange={e=>setDraftName(e.target.value)}
          className="text-xl font-mono font-bold tracking-tight text-slate-700 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none px-0.5"
          style={{ width: `${Math.max(draftName.length, 2)+0.3}ch` }}
        />
        <div className="relative shrink-0">
          <button onClick={(e)=>{e.stopPropagation();setKindOpen(o=>!o);}} className="text-sm px-2.5 pt-[2.7px] pb-[5px] rounded-full bg-slate-800 text-white font-medium capitalize hover:bg-slate-700 whitespace-nowrap">{kindCache}</button>
          {kindOpen && (
            <div className="absolute z-20 mt-1 left-0 w-32 rounded-lg border border-slate-200 bg-white shadow p-1 flex flex-col text-sm">
              {['interface','type','enum','alias'].map(k => (
                <button key={k} onClick={()=>changeKind(k as TypeKind)} className="text-left px-2 py-1 rounded hover:bg-slate-100 capitalize">
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <ul className="space-y-1 max-w-xs">
        {localProps.map(p => {
          const isExpanded = expandedProp === p.id;
          return (
            <li key={p.id} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs relative">
              <div className="flex items-center gap-2">
                <input
                  value={p.name}
                  onChange={e=>commitProp(p.id,{ name: e.target.value })}
                  className="bg-transparent text-lg font-mono font-normal w-24 border-b border-transparent focus:border-indigo-400 focus:outline-none"
                />
                <button onClick={()=>setExpandedProp(isExpanded?null:p.id)} className="ml-auto text-sm px-1.5 py-0.5 rounded bg-slate-300 text-slate-700 hover:bg-slate-400">{p.type}</button>
                <button onClick={()=>toggleOptional(p.id)} className={`text-sm px-1.5 py-0.5 rounded ${p.optional? 'bg-indigo-600 text-white':'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>?</button>
                <button onClick={()=>toggleReadonly(p.id)} className={`text-sm px-1.5 py-0.5 rounded ${p.readonly? 'bg-pink-600 text-white':'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>ro</button>
              </div>
              {isExpanded && (
                <div className="mt-2 bg-white rounded-lg border border-slate-200 p-2 space-y-2 shadow-inner">
                  <div>
                    <div className="text-sm font-medium mb-1 text-slate-500">기본 타입</div>
                    <div className="flex flex-wrap gap-1">
                      {PRIMITIVES.map(t => (
                        <button key={t} onClick={()=>{commitProp(p.id,{ type: t }); setExpandedProp(null);}} className={`px-2 py-0.5 rounded text-sm border ${t===p.type? 'bg-indigo-600 text-white border-indigo-600':'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1 text-slate-500 flex items-center gap-2">커스텀 타입<input value={customTypeFilter} onChange={e=>setCustomTypeFilter(e.target.value)} placeholder="filter" className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-sm" /></div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-auto pr-1">
                      {filteredCustomTypes.map(t => (
                        <button key={t} onClick={()=>{commitProp(p.id,{ type: t }); setExpandedProp(null);}} className={`px-2 py-0.5 rounded text-sm border ${t===p.type? 'bg-indigo-600 text-white border-indigo-600':'bg-white border-slate-200 hover:bg-slate-100'}`}>{t}</button>
                      ))}
                      {filteredCustomTypes.length === 0 && <span className="text-sm text-slate-400">없음</span>}
                    </div>
                  </div>
                  <div>
                    <textarea
                      value={p.comment || ''}
                      onChange={e=>commitProp(p.id,{ comment: e.target.value })}
                      placeholder="주석/설명"
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-1 resize-none h-14 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2 mt-3">
        <button
          className="w-6 h-6 flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-400 transition"
          title="속성 추가"
          onClick={(e)=>{e.stopPropagation(); addProperty();}}
        >+
        </button>
      </div>
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
