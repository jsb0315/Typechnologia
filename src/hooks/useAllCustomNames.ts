import { useMemo } from 'react';
import { useSchemaState } from '../App';
import type { typeBoxID } from '../types/TypeSchema';

/**
 * Returns a map of all TypeBox names (excluding the provided one) to their ids.
 * Useful for offering custom type reference selections.
 */
export function useAllCustomNames(excludeName?: string) {
  const state = useSchemaState();
  return useMemo(() => {
    const map: Record<string, typeBoxID> = {};
    Object.values(state.boxes).forEach(b => {
      if (!excludeName || b.name !== excludeName) {
        map[b.name] = b.id;
      }
    });
    return map;
  }, [state.boxes, excludeName]);
}

// Reverse mapping: id -> name (for displaying custom type references)
export function useTypeIdToName() {
  const state = useSchemaState();
  return useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(state.boxes).forEach(b => { map[b.id] = b.name; });
    return map;
  }, [state.boxes]);
}
