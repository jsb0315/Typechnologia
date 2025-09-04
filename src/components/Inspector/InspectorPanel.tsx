import React, { useState, useRef } from 'react';
import { useSchemaState, useSchemaActions } from '../../App';
import type { Property, PrimitiveType, ValueKind, TypeBoxModel } from '../../types/TypeSchema';
import { KEYKIND, PRIMITIVES, CONTAINERS } from '../Canvas/typeUtils';
import { useAllCustomNames } from '../../hooks/useAllCustomNames';

const InspectorPanel: React.FC = () => {
    const state = useSchemaState();
    const actions = useSchemaActions();
    const activeBox: TypeBoxModel | null = state.selection.length === 1 ? state.boxes[state.selection[0]] : null;
    // name 은 로컬 state 없이 즉시 전역 반영
    const [filter, setFilter] = useState('');

    const allCustomNames = useAllCustomNames(activeBox?.name);
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
            <div className="w-80 flex flex-col rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-5 z-50 space-y-3 text-base text-slate-500"
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

    const removeProperty = (id: string) => {
        updateBox({ properties: activeBox.properties.filter(p => p.id !== id) });
        if (state.propertySelection === id) actions.selectProperty && actions.selectProperty(null);
    };

    const handleTypeSelect = (prop: Property, valueType: PrimitiveType) => {
        // 2) 신규 인터페이스(valueKind 기반) ---------------------------------
        // primitive 선택
        if (prop.valueKind === 'primitive') {
            // primitive 관련 필드 초기화
            updateProperty(prop.id, {
                valueType: [valueType]
            });
        } else {    // container
            // 컨테이너 분기 (array / tuple / union 내부 선택 처리)
            const list = prop.valueType ? [...prop.valueType] : [];

            if (prop.valueKind === 'array' || prop.valueKind === 'set') {
                // element: Property[] (요소 타입 후보들 → union 의미)
                const idx = list.findIndex(
                    e => e === valueType
                );
                if (idx >= 0) {
                    list.splice(idx, 1); // toggle 제거
                    if (prop.valueKind === 'set' && !list.length)
                        list.push('any');
                } else {
                    if (list.length === 1 && list[0] === 'any')
                       list.pop();
                    list.push(valueType);
                }
                updateProperty(prop.id, { valueType: list });
                return;
            }
            if (prop.valueKind === 'tuple') {
                if (list.length === 1 && list[0] === 'any')
                    list.pop();
                // 순서 유지: 뒤에 append
                list.push(valueType);
                updateProperty(prop.id, { valueType: list });
                return;
            }
            // if (prop.valueKind === 'union') {
            //     const items = prop.items ? [...prop.items] : [];
            //     const idx = items.findIndex(
            //         o => o.valueKind === 'primitive' && o.valueType === valueType
            //     );
            //     if (idx >= 0) {
            //         items.splice(idx, 1);
            //     } else {
            //         items.push({
            //             id: Math.random().toString(36).slice(2),
            //             keyKind: 'literal',
            //             key: valueType,
            //             valueKind: 'primitive',
            //             valueType: valueType as PrimitiveType
            //         });
            //     }
            //     updateProperty(prop.id, { items });
            //     return;
            // }
        }
    };

    // makePrimitiveProp removed (old container logic removed)

    const handleTypeBuild = (prop: Property, k: ValueKind) => {
        let valueKind = k;
        let valueType = prop.valueType ?? [];
        const [first] = valueType;

        switch (valueKind) {
            case prop.valueKind: // 토글
                valueKind = "primitive";
                valueType = first ? [first] : ["any"];
                break;

            case "array": // array일 땐 중복 제거
                valueType = Array.from(new Set(valueType));
                break;

            case "tuple": // tuple|set 땐 첫 원소만 남김
            case "set":
                valueType = first ? [first] : ["any"];
                break;
        }

        updateProperty(prop.id, { valueKind, valueType });



        // Map / Object 는 children 구조 사용
        // if (t === 'map') {
        //     // 이미 간단 Map 표현이면 primitive/children 상태 유지
        //     if (prop.valueKind === 'object' && prop.items?.some(c => c.key === 'key') && prop.items?.some(c => c.key === 'value')) {
        //         // 토글 해제: key/value 첫 value 타입만 남기거나 any
        //         const val = prop.items.find(c => c.key === 'value');
        //         if (val?.valueKind === 'primitive') {
        //             updateProperty(prop.id, {
        //                 valueKind: 'primitive',
        //                 valueType: val.valueType,
        //                 items: undefined
        //             });
        //         } else {
        //             updateProperty(prop.id, {
        //                 valueKind: 'primitive',
        //                 valueType: ['any'],
        //                 items: undefined
        //             });
        //         }
        //     } else {
        //         // Map 으로 설정
        //         updateProperty(prop.id, {
        //             valueKind: 'object',
        //             items: [
        //                 makePrimitiveProp('string', 'key'),
        //                 makePrimitiveProp(prop.valueKind === 'primitive' && prop.valueType ? prop.valueType[0] : 'any', 'value')
        //             ]
        //         });
        //     }
        //     return;
        // }

        // if (t === 'object') {
        //     if (prop.valueKind === 'object') {
        //         // 토글 해제 -> children 있으면 첫 primitive 유지, 없으면 any
        //         const firstPrim = prop.items?.find(c => c.valueKind === 'primitive');
        //         updateProperty(prop.id, {
        //             valueKind: 'primitive',
        //             valueType: firstPrim?.valueType ?? ['any'],
        //             items: undefined
        //         });
        //     } else {
        //         updateProperty(prop.id, {
        //             valueKind: 'object',
        //             items: []
        //         });
        //     }
        //     return;
        // }


        // Generic 등 미지원 → noop 또는 향후 확장
        // t === 'Generic' 등은 스킵
    };

    const selectedProp = state.propertySelection ? activeBox.properties.find(p => p.id === state.propertySelection) : null;

    // Focused Property Editor
    const renderPropertyEditor = (prop: Property) => (
        <div key={prop.id}>
            <div className="flex justify-between mb-2">
                <input
                    ref={el => { propInputRefs.current[prop.id] = el; }}
                    value={prop.key}
                    onChange={e => updateProperty(prop.id, { key: e.target.value })}
                    className="w-1/2 bg-transparent border-b border-transparent focus:border-slate-400 outline-none text-lg font-mono" />
                <div className='flex gap-1 items-end'>
                    <button onClick={(e) => { e.stopPropagation(); updateProperty(prop.id, { optional: !prop.optional }); }}
                        className={`font-mono text-sm px-2 py-0.5 rounded-full border ${prop.optional ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}>?</button>
                    <button onClick={(e) => { e.stopPropagation(); updateProperty(prop.id, { readonly: !prop.readonly }); }}
                        className={`font-mono text-sm px-2 py-0.5 rounded-full border ${prop.readonly ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'}`}>readonly</button>
                </div>
            </div>
            <div className='flex flex-col gap-1 mb-3'>
                <span className='text-sm font-medium text-slate-500'>타입 정의 패턴</span>
                <div className="flex flex-wrap gap-1">
                    {KEYKIND.map(t => {
                        const active = prop.keyKind === t;
                        return (
                            <button key={t}
                                onClick={() => updateProperty(prop.id, { keyKind: t })}
                                className={`font-mono px-2 py-0.5 rounded-full text-base border ${active ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>{t}</button>
                        );
                    })}
                </div>
            </div>
            <div className='flex flex-col gap-1 mb-3'>
                <span className='text-sm font-medium text-slate-500'>기본 타입</span>
                <div className="flex flex-wrap gap-1">
                    {PRIMITIVES.map(t => {
                        const active = prop.valueType.includes(t);
                        // || (prop.type.kind === 'builtIn' && prop.type.genericArgs?.some(arg => (arg as any).name === t));
                        return (
                            <button key={t} onClick={() => handleTypeSelect(prop, t)}
                                className={`font-mono px-2 py-0.5 rounded-full text-base border ${active ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>{t}</button>
                        );
                    })}
                </div>
            </div>
            <div className="flex flex-col gap-1 mb-3">
                {/* 커스텀 타입 */}
                <div className="flex items-center justify-between">
                    <span className='text-sm font-medium text-slate-500'>커스텀 타입</span>
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="filter" className="bg-slate-50 border border-slate-200 rounded px-1 py-0 text-sm focus:outline-none" style={{ width: 70 }} />
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-auto pr-1">
                    {activeBox.name.toLowerCase().includes(filter.toLowerCase()) && (
                        <button onClick={() => handleTypeSelect(prop, activeBox.id)}
                            className={`font-mono px-2 py-0.5 rounded-full text-base border ${prop.valueType.includes(activeBox.id) ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>{activeBox.name}</button>
                    )}
                    {Object.keys(allCustomNames).filter(n => n.toLowerCase().includes(filter.toLowerCase())).map(n => {
                        const active = (prop.valueType.includes(allCustomNames[n]));
                        return (
                            <button key={n} onClick={() => handleTypeSelect(prop, allCustomNames[n])}
                                className={`font-mono px-2 py-0.5 rounded-full text-base border ${active ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                        );
                    })}
                </div>
            </div>
            <div className="flex flex-col gap-1 mb-3">
                <div className="flex items-center justify-between">
                    <span className='text-sm font-medium text-slate-500'>컨테이너 타입</span>
                    <button
                        onClick={() => {
                            if (prop.valueKind === 'primitive') return;
                            const args = [...(prop.valueType || [])];
                            args.pop();
                            if (args.length === 0) updateProperty(prop.id, { valueKind: prop.valueKind, valueType: prop.valueKind === 'array' ? [] : ['any'] });
                            else updateProperty(prop.id, { valueKind: prop.valueKind, valueType: args });
                        }} className="px-1.5 py-0 rounded-full text-base border border-slate-200 bg-slate-50 text-slate-600 hover:bg-red-400 hover:text-white">⬅</button>
                </div>
                <div className="flex flex-wrap gap-1">
                    {CONTAINERS.map(t => {
                        const active = prop.valueKind === t;
                        return (
                            <button key={t} onClick={() => handleTypeBuild(prop, t)}
                                className={`capitalize font-mono px-2 py-0.5 rounded-full text-base border ${active ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>{t}</button>
                        );
                    })}
                </div>
            </div>
            <textarea value={prop.description || ''} onChange={e => updateProperty(prop.id, { description: e.target.value })}
                placeholder="주석" className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-1 h-14 resize-none outline-none focus:border-slate-300" />
        </div>
    );

    return (
        <div className="w-80 flex flex-col max-h-[calc(100vh-2rem)] rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-5 z-50 space-y-3" style={{ boxShadow: '0 2px 8px rgba(135,135,135,0.1)' }}>
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
                            className={`font-mono px-2 py-1 rounded border text-base ${activeBox.kind === k ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-300 hover:bg-slate-100'}`}>{k}</button>
                    ))}
                </div>
            </div>
            {!selectedProp &&
                <textarea value={activeBox.comment || ''} onChange={e => updateBox({ comment: e.target.value })}
                    placeholder="주석" className="m-0 w-full text-base bg-slate-50 border border-slate-200 rounded p-1 h-24 resize-none outline-none focus:border-slate-300" />
            }
            {selectedProp && (
                <div className="flex-1 overflow-auto space-y-4">
                    {renderPropertyEditor(selectedProp)}
                </div>
            )}
        </div>
    );
};

export default InspectorPanel;
