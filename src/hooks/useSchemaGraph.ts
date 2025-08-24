import { useCallback, useRef, useState, useMemo } from 'react';
import type { SchemaGraph, TypeBoxModel, SchemaContextValue, Property } from '../types/TypeSchema';
import { nanoid } from '../utils/id';

const now = () => Date.now();

const emptyGraph = (): SchemaGraph => ({ boxes: {}, order: [], version: 1, updatedAt: now() });

export function useSchemaGraph(): SchemaContextValue {
  const [graph, setGraph] = useState<SchemaGraph>(emptyGraph);
  const [selection, setSelection] = useState<string[]>([]);
  const dirty = useRef(false);

    const removeBox = useCallback((id: string) => {
      setGraph(g => {
        if (!g.boxes[id]) return g;
        const { [id]: _, ...restBoxes } = g.boxes;
        const newOrder = g.order.filter(boxId => boxId !== id);
        setSelection(sel => sel.filter(sid => sid !== id));
        return { ...g, boxes: restBoxes, order: newOrder, updatedAt: now() };
      });
      dirty.current = true;
    }, []);

    const removeBoxes = useCallback((ids: string[]) => {
      if (!ids.length) return;
      setGraph(g => {
        const restBoxes = { ...g.boxes };
        let changed = false;
        ids.forEach(id => {
          if (restBoxes[id]) { delete restBoxes[id]; changed = true; }
        });
        if (!changed) return g;
        const idSet = new Set(ids);
        const newOrder = g.order.filter(bid => !idSet.has(bid));
        setSelection(sel => sel.filter(sid => !idSet.has(sid)));
        return { ...g, boxes: restBoxes, order: newOrder, updatedAt: now() };
      });
      dirty.current = true;
    }, []);
  // 레거시(Property.type 이 string) -> 구조화 PropertyType 변환
  const normalizeProps = (props?: Property[]): Property[] => {
    if (!props) return [];
    return props.map(p => {
      const t: any = p.type as any;
      if (typeof t === 'string') {
        const primitiveSet = new Set(['string','number','boolean','null','undefined','any','unknown']);
        const structured = primitiveSet.has(t)
          ? { kind: 'primitive', name: t }
          : { kind: 'custom', name: t };
        return { ...p, type: structured } as Property;
      }
      return p;
    });
  };

  const addType = useCallback((partial?: Partial<Pick<TypeBoxModel, 'name' | 'kind' | 'properties'>>) => {
    const id = nanoid();
    const baseProps: Property[] = partial?.properties
      ? normalizeProps(partial.properties as any)
      : [
          { id: nanoid(), name: 'id', type: { kind: 'primitive', name: 'string' } },
          { id: nanoid(), name: 'name', type: { kind: 'primitive', name: 'string' } },
          { id: nanoid(), name: 'test', type: { kind: 'custom', name: 'hello' } }
        ];
    const model: TypeBoxModel = {
      id,
      name: partial?.name || `NewType${graph.order.length + 1}`,
      kind: partial?.kind || 'type',
      properties: baseProps,
    //   position: { x: 120 + graph.order.length * 40, y: 120 },
      position: { x: 0, y: 0 },
      createdAt: now(),
      updatedAt: now(),
      extends: []
    };
    setGraph(g => ({
      ...g,
      boxes: { ...g.boxes, [id]: model },
      order: [...g.order, id],
      updatedAt: now()
    }));
  setSelection([id]);
    dirty.current = true;
    return model;
  }, [graph.order.length]);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setGraph(g => {
      const box = g.boxes[id];
      if (!box) return g;
      return {
        ...g,
        boxes: { ...g.boxes, [id]: { ...box, position: { x, y }, updatedAt: now() } },
        updatedAt: now()
      };
    });
    dirty.current = true;
  }, []);

  const select = useCallback((id: string | null, options?: { additive?: boolean }) => {
    setSelection(prev => {
      if (id === null) return [];
      if (!options?.additive) return [id];
      const exists = prev.includes(id);
      if (exists) return prev.filter(x => x !== id); // 토글 해제
      return [...prev, id];
    });
  }, []);

  const updateBox = useCallback((id: string, partial: Partial<Omit<TypeBoxModel, 'id' | 'createdAt'>>) => {
    setGraph(g => {
      const original = g.boxes[id];
      if (!original) return g;
      const updated: TypeBoxModel = { ...original, ...partial, updatedAt: now() };
      return { ...g, boxes: { ...g.boxes, [id]: updated }, updatedAt: now() };
    });
    dirty.current = true;
  }, []);


  const value: SchemaContextValue = useMemo(() => ({
    ...graph,
    boxes: graph.boxes,
    order: graph.order,
    selection,
    addType,
    updatePosition,
    select,
    updateBox,
    removeBox,
    removeBoxes,
  }), [graph, selection, addType, updatePosition, select, updateBox, removeBox, removeBoxes]);

  return value;
}
