import type { TypePattern, PropertyType, PrimitiveType, BuiltInType } from '../../types/TypeSchema';

export const TYPEPATTERN: TypePattern[] = ['literal', 'primitive', 'object'];
export const PRIMITIVES: PrimitiveType[] = ['string', 'boolean', 'null', 'any', 'number', 'unknown', 'undefined'];
export const CONTAINERS: BuiltInType[] = ['Array', 'Tuple', 'Set', 'Map', 'Object'];

export function propertyTypeToLabel(t: PropertyType): string {
  switch (t.kind) {
    case 'primitive':
    case 'custom':
      return t.name;
    case 'union':
      return t.types.map(propertyTypeToLabel).join(' | ');
    case 'intersection':
      return t.types.map(propertyTypeToLabel).join(' & ');
    case 'builtIn': {
      const args = t.genericArgs?.map(propertyTypeToLabel) ?? [];
      switch (t.name) {
        case 'Array':
          return args.length > 1 ? `(${args.join(' | ')})[]` : (args[0] ? args[0] + '[]' : 'any[]');
        case 'Tuple':
          return `[${args.join(', ')}]`;
        case 'Set':
          return `Set<${args.length ? args[0] : 'unknown'}>`;
        case 'Map':
          return `Map<${args.length >= 2 ? `${args[0]}, ${args[1]}` : 'unknown, unknown'}>`;
        case 'Object':
          return `Record<${args.length >= 2 ? `${args[0]}, ${args[1]}` : 'string, unknown'}>`;
        default:
          return t.name;
      }
    }
    default:
      return '';
  }
}

export function makeLeafType(name: string): PropertyType {
  if (PRIMITIVES.includes(name as any)) return { kind: 'primitive', name: name as any };
  return { kind: 'custom', name };
}

export function makeBuiltInType(name: 'Array'|'Tuple'|'Set', selectedNames: string[]): PropertyType {
  const survived: string[] = name === 'Array' ? Array.from(new Set(selectedNames)) : name === 'Set' ? [selectedNames[0]] : selectedNames;
  if (selectedNames.length === 0) return { kind: 'builtIn', name, genericArgs: [{ kind: 'primitive', name: 'any' }] };
  return { kind: 'builtIn', name, genericArgs: survived.map(n => makeLeafType(n)) };
}

export function extractSimpleTypeNames(t: PropertyType): string[] {
  if (t.kind === 'primitive' || t.kind === 'custom') return [t.name];
  if (t.kind === 'builtIn') {
    return (t.genericArgs ?? [])
      .filter(a => a.kind === 'primitive' || a.kind === 'custom')
      .map(a => a.name);
  }
  return [];
}

export function isInteractive(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'LABEL'].includes(tag)) return true;
  if (el.isContentEditable) return true;
  const role = el.getAttribute('role');
  if (role && ['button', 'textbox', 'checkbox', 'switch', 'radio', 'combobox'].includes(role)) return true;
  if (el.closest('input,textarea,button,select,[contenteditable="true"],[role="textbox"],[role="button"]')) return true;
  return false;
}
