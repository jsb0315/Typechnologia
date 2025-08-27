import React, { useState, useMemo, useRef } from 'react';
import { useSchemaState, useSchemaActions } from '../../App';
import type { Property, PropertyType, PrimitiveType, BuiltInType, TypeBoxModel } from '../../types/TypeSchema';
import { PRIMITIVES, CONTAINERS, makeLeafType, makeBuiltInType } from '../Canvas/typeUtils';

const InspectorPanel: React.FC = () => {
    const state = useSchemaState();
    const actions = useSchemaActions();
    const activeBox: TypeBoxModel | null = state.selection.length === 1 ? state.boxes[state.selection[0]] : null;
    // name 은 로컬 state 없이 즉시 전역 반영
    const [filter, setFilter] = useState('');

    const allCustomNames = useMemo(() => Object.values(state.boxes).map(b => b.name).filter(n => n !== activeBox?.name), [state.boxes, activeBox?.name]);
    const propInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // TypeBox 에서 property 클릭 시 해당 input focus
    //   useEffect(() => {
    //     if (!activeBox) return;
    //     if (state.propertySelection) {
    //       const el = propInputRefs.current[state.propertySelection];
    //       if (el) {
    //         // scroll & focus
    //         el.focus();
    //         el.select();
    //         el.scrollIntoView({ block: 'nearest' });
    //       }
    //     }
    //   }, [state.propertySelection, activeBox?.id]);

    if (!activeBox) {
        return (
            <div className="w-80 flex flex-col rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-5 z-50 space-y-3 text-sm text-slate-500"
                style={{ boxShadow: '0 2px 8px rgba(135,135,135,0.1)' }}>
                단일 TypeBox 를 선택하면 상세 편집 가능</div>
        );
    }

    const updateBox = (patch: Partial<TypeBoxModel>) => actions.updateBox(activeBox.id, patch);

    // 이름은 입력과 동시에 updateBox 수행

    const updateProperty = (id: string, patch: Partial<Property>) => {
        const newProps = activeBox.properties.map(p => p.id === id ? { ...p, ...patch } : p);
        updateBox({ properties: newProps });
    };

    const addProperty = () => {
        const newProp: Property = { id: Math.random().toString(36).slice(2), name: 'field', type: { kind: 'primitive', name: 'string' } } as Property;
        updateBox({ properties: [...activeBox.properties, newProp] });
    };

    const removeProperty = (id: string) => {
        updateBox({ properties: activeBox.properties.filter(p => p.id !== id) });
        if (state.propertySelection === id) actions.selectProperty && actions.selectProperty(null);
    };

    const handleTypeSelect = (prop: Property, kind: 'primitive' | 'custom', name: string) => {
        if (prop.type.kind === 'builtIn') {
            const BuiltinType = prop.type.name;
            const chgArg = makeLeafType(name);
            let args = prop.type.genericArgs ?? [];
            if (prop.type.name === 'Array') {
                const exists = args.some(arg => JSON.stringify(arg) === JSON.stringify(chgArg));
                args = exists ? args.filter(arg => JSON.stringify(arg) !== JSON.stringify(chgArg)) : [...args, chgArg];
            } else if (prop.type.name === 'Tuple') {
                args = [...args, chgArg];
            } else if (prop.type.name === 'Set') {
                args = [chgArg];
            }
            updateProperty(prop.id, { type: { kind: 'builtIn', name: BuiltinType, genericArgs: args } as PropertyType });
        } else {
            if (kind === 'primitive') updateProperty(prop.id, { type: { kind: 'primitive', name: name as PrimitiveType } });
            else updateProperty(prop.id, { type: { kind: 'custom', name } });
        }
    };

    const handleTypeBuild = (prop: Property, t: BuiltInType) => {
        if (prop.type.kind === 'builtIn' && prop.type.name === t) {
            const args = prop.type.genericArgs || [];
            const base = args[0];
            if (base && (base.kind === 'primitive' || base.kind === 'custom')) {
                updateProperty(prop.id, { type: base });
            }
        } else if (t !== 'Map' && t !== 'Object' && t !== 'Generic') {
            const baseArgNames = (prop.type.kind === 'primitive' || prop.type.kind === 'custom') ? [prop.type.name] : [];
            updateProperty(prop.id, { type: makeBuiltInType(t, baseArgNames) });
        } else {
            updateProperty(prop.id, { type: { kind: 'builtIn', name: t } as PropertyType });
        }
    };

    const selectedProp = state.propertySelection ? activeBox.properties.find(p => p.id === state.propertySelection) : null;

    // Focused Property Editor
    const renderPropertyEditor = (prop: Property) => (
        <div key={prop.id} className="rounded-lg border p-2 bg-white border-slate-200">
            <div className="flex items-center gap-2 mb-2">
                <input
                    ref={el => { propInputRefs.current[prop.id] = el; }}
                    value={prop.name}
                    onChange={e => updateProperty(prop.id, { name: e.target.value })}
                    className="flex-1 bg-transparent border-b border-transparent focus:border-slate-400 outline-none text-sm font-mono" />
                <button onClick={() => removeProperty(prop.id)} className="w-6 h-6 text-xs rounded-full bg-red-500 text-white flex items-center justify-center">-</button>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
                {PRIMITIVES.map(t => {
                    const active = (prop.type.kind === 'primitive' && prop.type.name === t) || (prop.type.kind === 'builtIn' && prop.type.genericArgs?.some(arg => (arg as any).name === t));
                    return (
                        <button key={t} onClick={() => handleTypeSelect(prop, 'primitive', t)}
                            className={`px-2 py-0.5 rounded-full text-[11px] border ${active ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>{t}</button>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
                {CONTAINERS.map(t => {
                    const active = prop.type.kind === 'builtIn' && prop.type.name === t;
                    return (
                        <button key={t} onClick={() => handleTypeBuild(prop, t)}
                            className={`px-2 py-0.5 rounded-full text-[11px] border ${active ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>{t}</button>
                    );
                })}
                {prop.type.kind === 'builtIn' && prop.type.genericArgs && prop.type.genericArgs.length > 0 && (
                    <button onClick={() => {
                        if (prop.type.kind !== 'builtIn') return;
                        const args = [...(prop.type.genericArgs || [])];
                        args.pop();
                        if (args.length === 0) updateProperty(prop.id, { type: { kind: 'primitive', name: 'any' } });
                        else updateProperty(prop.id, { type: { ...prop.type, genericArgs: args } });
                    }} className="px-2 py-0.5 rounded-full text-[11px] border bg-slate-50 hover:bg-red-400 hover:text-white">⬅</button>
                )}
            </div>
            <div className="mb-3">
                <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-2">
                    <span>커스텀</span>
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="filter" className="bg-slate-50 border border-slate-200 rounded px-1 py-0 text-[11px] focus:outline-none" style={{ width: 70 }} />
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-auto pr-1">
                    {activeBox.name.toLowerCase().includes(filter.toLowerCase()) && (
                        <button onClick={() => handleTypeSelect(prop, 'custom', activeBox.name)}
                            className={`px-2 py-0.5 rounded-full text-[11px] border ${(prop.type.kind === 'custom' && prop.type.name === activeBox.name) || (prop.type.kind === 'builtIn' && prop.type.genericArgs?.some(arg => (arg as any).name === activeBox.name)) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>{activeBox.name}</button>
                    )}
                    {allCustomNames.filter(n => n.toLowerCase().includes(filter.toLowerCase())).map(n => {
                        const active = (prop.type.kind === 'custom' && prop.type.name === n) || (prop.type.kind === 'builtIn' && prop.type.genericArgs?.some(arg => (arg as any).name === n));
                        return (
                            <button key={n} onClick={() => handleTypeSelect(prop, 'custom', n)}
                                className={`px-2 py-0.5 rounded-full text-[11px] border ${active ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                        );
                    })}
                </div>
            </div>
            <textarea value={prop.comment || ''} onChange={e => updateProperty(prop.id, { comment: e.target.value })}
                placeholder="주석" className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded p-1 h-24 resize-none outline-none focus:border-slate-300" />
            <div className="flex gap-2 mt-3 text-[11px]">
                <button onClick={(e) => { e.stopPropagation(); updateProperty(prop.id, { optional: !prop.optional }); }}
                    className={`px-2 py-0.5 rounded-full border ${prop.optional ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}>optional</button>
                <button onClick={(e) => { e.stopPropagation(); updateProperty(prop.id, { readonly: !prop.readonly }); }}
                    className={`px-2 py-0.5 rounded-full border ${prop.readonly ? 'bg-pink-600 text-white border-pink-600' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}>readonly</button>
            </div>
        </div>
    );

    return (
        <div className="w-80 flex flex-col rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-5 z-50 space-y-3" style={{ boxShadow: '0 2px 8px rgba(135,135,135,0.1)' }}>
            {/* TypeBoxModel header */}
            <div className="pb-3 border-b border-slate-200 bg-white/70 backdrop-blur">
                <input
                    value={activeBox.name}
                    onChange={e => updateBox({ name: e.target.value })}
                    className="w-full bg-transparent text-lg font-semibold border-b border-transparent focus:border-slate-400 outline-none"
                />
                <div className="mt-2 flex gap-1 text-xs">
                    {(['interface', 'type', 'enum', 'alias'] as const).map(k => (
                        <button key={k} onClick={() => updateBox({ kind: k })}
                            className={`px-2 py-1 rounded border text-[11px] ${activeBox.kind === k ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-300 hover:bg-slate-100'}`}>{k}</button>
                    ))}
                </div>
            </div>
            {!selectedProp &&
                <textarea value={''}
                    placeholder="주석" className="m-0 w-full text-[11px] bg-slate-50 border border-slate-200 rounded p-1 h-24 resize-none outline-none focus:border-slate-300" />
            }
            {selectedProp && (
                <div className="flex-1 overflow-auto p-1 space-y-4">
                    {renderPropertyEditor(selectedProp)}
                </div>
            )}
        </div>
    );
};

export default InspectorPanel;
