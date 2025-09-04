import { nanoid } from './id';
import type { Property, PropertyType } from '../types/TypeSchema';

// Convert legacy PropertyType into new valueKind structure recursively.
export function convertType(pt: PropertyType): Partial<Property> {
  switch (pt.kind) {
    case 'primitive': {
      return {
        valueKind: 'primitive',
        valueType: (['string','number','boolean'] as const).includes(pt.name as any) ? pt.name as any : undefined
      };
    }
    case 'custom': {
      return { valueKind: 'object', children: [] }; // treat custom as object placeholder
    }
    case 'builtIn': {
      if (pt.name === 'Array' || pt.name === 'Set') {
        const elemType = pt.genericArgs?.[0];
        return {
          valueKind: 'array',
          element: elemType ? synthesizeFromType(elemType, 'element') : undefined
        };
      }
      if (pt.name === 'Tuple') {
        return {
          valueKind: 'tuple',
          elements: (pt.genericArgs || []).map((t,i)=> synthesizeFromType(t, 't'+i))
        };
      }
      if (pt.name === 'Object' || pt.name === 'Map') {
        return { valueKind: 'object', children: [] };
      }
      return { valueKind: 'object', children: [] };
    }
    case 'union': {
      return {
        valueKind: 'union',
        options: pt.types.map((t,i)=> synthesizeFromType(t, 'u'+i))
      };
    }
    case 'intersection': {
      // Simplify intersection as union of members for now
      return {
        valueKind: 'union',
        options: pt.types.map((t,i)=> synthesizeFromType(t, 'i'+i))
      };
    }
    default:
      return {};
  }
}

function synthesizeFromType(pt: PropertyType, key: string): Property {
  const base: Property = {
    id: nanoid(),
    name: key,
    typePattern: 'object', // legacy placeholder
    type: pt,
    keyKind: 'literal',
    key,
    ...convertType(pt)
  } as any;
  return base;
}

export function migrateProperty(p: Property): Property {
  if (p.keyKind && p.valueKind) return p; // already migrated
  const key = p.name;
  const converted = convertType(p.type);
  return {
    ...p,
    keyKind: 'literal',
    key,
    description: p.comment || p.description,
    ...converted
  };
}

export function migrateProperties(list: Property[]): Property[] {
  return list.map(migrateProperty);
}
