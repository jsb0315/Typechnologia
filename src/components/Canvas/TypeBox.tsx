import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { TypeBoxModel, Property, TypeKind, PropertyType, PrimitiveType, BuiltInType } from '../../types/TypeSchema';
import { useSchema } from '../../App';
import { PRIMITIVES, CONTAINERS, propertyTypeToLabel, makeLeafType, makeBuiltInType } from './typeUtils';

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

  // Delete 키 제거 로직은 Canvas에서 다중 선택과 함께 처리

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
    onSelect(data.id, e);

  const target = e.target as HTMLElement;
  if (target.closest('input,textarea,button,select,[contenteditable="true"],label')) return;

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
    const newProp: Property = { id: Math.random().toString(36).slice(2), name: 'field', type: { kind: 'primitive', name: 'string' } };
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

  const extractSimpleTypeNames = (t: PropertyType): string[] => {
    if (t.kind === 'primitive' || t.kind === 'custom') return [t.name];
    if (t.kind === 'builtIn') {
    return (t.genericArgs ?? [])
      .filter(a => a.kind === 'primitive' || a.kind === 'custom')
      .map(a => a.name);
    }
    return [];
  };

  // (기본|커스텀) 타입 버튼 클릭 공통 처리
  const handleTypeSelect = (kind: "primitive" | "custom", name: string, prop: Property) => {
    if (prop.type.kind === 'builtIn') {
      const BuiltinType = prop.type.name;
      const chgArg = makeLeafType(name);
      let args = prop.type.genericArgs ?? [];
      if (prop.type.name === 'Array'){
        const exists = args.some(arg => JSON.stringify(arg) === JSON.stringify(chgArg));
        if (exists) {
          args = args.filter(arg => JSON.stringify(arg) !== JSON.stringify(chgArg));
        } else {
          args.push(chgArg);
        }
      } else if (prop.type.name === 'Tuple') {
        args.push(chgArg);
      } else if (prop.type.name === 'Set') {
        args = [chgArg]; // Set은 단일 타입만
      }
      commitProp(prop.id, { type: { kind: 'builtIn', name: BuiltinType, genericArgs: args } });
    }
    else {
      if (kind === 'primitive') {
        commitProp(prop.id, { type: { kind: 'primitive', name: name as PrimitiveType } });
      } else {
        commitProp(prop.id, { type: { kind: 'custom', name } });
      }
      setExpandedProp(null);
    }
  };

  const handleTypeBuild = (t: BuiltInType, prop: Property) => {
    // [] / Tuple 전용 처리: 추가 선택 UI는 추후 확장 (지금은 기본/단일 예시)
    const baseArg: string[] = extractSimpleTypeNames(prop.type);

    if ((prop.type.kind === 'builtIn') && prop.type.name === t) {
      const leaf = baseArg[0];
      if (leaf) {
        commitProp(prop.id, { type: makeLeafType(leaf) });
      }
    }
    else if (t !== 'Map' && t !== 'Object' && t !== 'Generic' ) {
      commitProp(prop.id, { type: makeBuiltInType(t, baseArg) });
    } else {
      // Map / Object 등 일반 builtIn
      commitProp(prop.id, { type: { kind: 'builtIn', name: t as any } });
    }
    // setExpandedProp(null);
  }

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className={`absolute bg-slate-50/80 backdrop-blur rounded-xl shadow-lg border ${border} cursor-move select-none px-6 pt-5.5 pb-6.5 transition flex flex-col items-center`}
      style={{ left: data.position.x, top: data.position.y, minWidth: 200, zIndex: selected ? 30 : 10 }}
    >
      <button
        className={`absolute -top-3.5 w-7 h-7 rounded-full bg-slate-50 border border-slate-300 text-slate-600 hover:bg-red-400 hover:text-slate-50 hover:border-slate-200 transition-all shadow font-mono hover:opacity-100  ${selected ? 'opacity-100' : 'opacity-0'}`}
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
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          className="text-2xl font-mono font-bold tracking-tight text-slate-700 bg-transparent border-b border-transparent focus:border-slate-400 focus:outline-none px-0.5"
          style={{ width: `${Math.max(draftName.length, 2) + 0.3}ch` }}
        />
        <div className="relative shrink-0">
          <button onClick={(e) => handleKindButtonClick(e)} className="text-base px-2.5 pt-[2.7px] pb-[5px] rounded-full bg-slate-500 text-white font-mono capitalize hover:bg-slate-600 whitespace-nowrap shadow transition-colors"
            style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.10)' }}
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
      <ul className=" w-full space-y-4">
        {localProps.map(p => {
          const isExpanded = expandedProp === p.id;
          return (
            <div key={p.id}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="relative flex w-full items-center">
              <div className={`relative w-fit flex items-center px-4 py-1.5 rounded-full border border-slate-300/70 bg-white text-xs font-mono`}
                style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.05)' }}
              >
                <div className='group'>
                  {selected && (
                    <button onClick={() => toggleOptional(p.id)} className={`absolute -left-2.5 -top-1.5 text-sm px-2 py-0.5 rounded-full transition-all ${p.optional ? 'opacity-100 bg-slate-400 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} shadow ${hoveredId === p.id ? 'opacity-100' : 'opacity-0'}`}>?
                    </button>
                  )}
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
                    className="absolute left-0 -top-2 text-sm pl-2 pr-2.5 py-1 -tracking-wider rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 shadow whitespace-nowrap border border-slate-400/40 transition-all"
                    style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.05)' }}
                  >
                    {propertyTypeToLabel(p.type as any)}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="absolute left-0 top-11 w-[220px] bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow z-30"
                  style={{ boxShadow: '0 8px 32px rgba(60,60,100,0.1)' }}>
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <div className="text-base font-medium text-slate-500 ml-0.5">기본 타입</div>
                      <button onClick={() => toggleReadonly(p.id)} className={`text-sm px-2 py-0.5 rounded-full ${p.readonly ? 'bg-pink-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} shadow`}>read only</button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {PRIMITIVES.map(t => {
                        const active =
                          (p.type.kind === 'primitive' && p.type.name === t) ||
                          (p.type.kind === 'builtIn'
                            && p.type.genericArgs
                            && p.type.genericArgs.some(arg =>
                              (arg as any).name === t
                            ));
                        return (
                          <button
                            key={t}
                            onClick={() => handleTypeSelect('primitive', t, p)}
                            className={`font-mono px-2.5 py-1 rounded-full text-base border ${active ? 'bg-slate-600 text-white border-slate-600' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>{t}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <div className="text-base font-medium text-slate-500 ml-0.5">컬렉션/매핑 타입</div>
                        <button
                        onClick={() => {
                          if (p.type.kind === 'builtIn') {
                          const args = [...(p.type.genericArgs || [])];
                          args.pop();
                          if (args.length > 0) {
                            commitProp(p.id, { type: { ...p.type, genericArgs: args } });
                          } else {
                            // 모든 generic이 제거되면 any 로 폴백
                            commitProp(p.id, { type: { kind: 'primitive', name: 'any' } });
                          }
                          }
                        }}
                        className="text-sm px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-400 hover:bg-red-400 hover:text-slate-100 shadow transition-colors"
                        >⬅</button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {CONTAINERS.map(t => {
                        const active = p.type.kind === 'builtIn' && p.type.name === t;
                        return (
                          <button
                            key={t}
                            onClick={() => handleTypeBuild(t, p)}
                            className={`font-mono px-2.5 py-1 rounded-full text-base border ${active ? 'bg-slate-600 text-white border-slate-600' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
                          >{t}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-base font-medium mb-1 text-slate-500 flex items-center gap-2">
                      <span className='flex whitespace-nowrap ml-0.5'>커스텀 타입</span>
                      <input value={customTypeFilter} onChange={e => setCustomTypeFilter(e.target.value)} placeholder="filter" className="flex-1 bg-slate-50 border border-slate-200 rounded px-1 py-0 text-base focus:outline-none focus:border-slate-400"
                        style={{ width: "70px" }} />
                    </div>
                    <div className="font-mono flex flex-wrap gap-1 max-h-24 overflow-auto pr-1 mb-4">
                      {/* Custom Type - 자기자신 */}
                      <button
                        onClick={() => handleTypeSelect('custom', draftName, p)}
                        className={`px-2.5 py-1 rounded-full text-base border ${p.type.kind === 'custom' && p.type.name === draftName || (p.type.kind === 'builtIn' && p.type.genericArgs && p.type.genericArgs.some(arg => (arg as any).name === draftName)) ? 'bg-slate-600 text-white border-slate-600' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>{draftName}</button>
                      {/* Custom Type - 나머지 */}
                      {filteredCustomTypes.map(t => {
                        const active =
                          (p.type.kind === 'custom' && p.type.name === t) ||
                          (p.type.kind === 'builtIn'
                            && p.type.genericArgs
                            && p.type.genericArgs.some(arg =>
                              (arg as any).name === t
                            ));
                        return (
                          <button key={t} onClick={() => handleTypeSelect('custom', t, p)} className={`px-2.5 py-1 rounded-full text-base border ${active ? 'bg-slate-600 text-white border-slate-600' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>{t}</button>
                        );
                      })}
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
              <span className="text-transparent font-mono mr-4">{propertyTypeToLabel(p.type as any)}</span>
              {selected && (
                <button
                  className={`absolute -right-2.5 w-6 h-6 flex items-center justify-center rounded-full border border-slate-200 bg-red-300 text-slate-100 hover:bg-red-500 transition-all shadow font-mono  ${hoveredId === p.id ? '' : 'opacity-0'}`}
                  onClick={() => setLocalProps(list => list.filter(prop => prop.id !== p.id))}
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
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all shadow"
            title="속성 추가"
            onClick={(e) => { e.stopPropagation(); addProperty(); }}
            style={{ boxShadow: '0 2px 8px rgba(60,60,100,0.05)' }}
          >+
          </button>
        </div>
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
