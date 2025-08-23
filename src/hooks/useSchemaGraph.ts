import { useCallback, useRef, useState, useMemo } from 'react';
import type { SchemaGraph, TypeBoxModel, SchemaContextValue } from '../types/TypeSchema';
import { nanoid } from '../utils/id';

const now = () => Date.now();

const emptyGraph = (): SchemaGraph => ({ boxes: {}, order: [], version: 1, updatedAt: now() });

export function useSchemaGraph(): SchemaContextValue {
  const [graph, setGraph] = useState<SchemaGraph>(emptyGraph);
  const [selection, setSelection] = useState<string | null>(null);
  const dirty = useRef(false);

  const addType = useCallback((partial?: Partial<Pick<TypeBoxModel, 'name' | 'kind' | 'properties'>>) => {
    const id = nanoid();
    const model: TypeBoxModel = {
      id,
      name: partial?.name || `NewType${graph.order.length + 1}`,
      kind: partial?.kind || 'type',
      properties: partial?.properties || [
        { id: nanoid(), name: 'id', type: 'string' },
        { id: nanoid(), name: 'name', type: 'string' },
        { id: nanoid(), name: 'test', type: 'ohohoh' }
      ],
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
    setSelection(id);
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

  const select = useCallback((id: string | null) => setSelection(id), []);

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
  }), [graph, selection, addType, updatePosition, select, updateBox]);

  return value;
}
