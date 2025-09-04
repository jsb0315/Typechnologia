import type { KeyKind, PrimitiveType, ValueKind, Property } from '../../types/TypeSchema';

export const KEYKIND: KeyKind[] = ['literal', 'index'];
export const PRIMITIVES: PrimitiveType[] = ['string', 'boolean', 'null', 'any', 'number', 'unknown', 'undefined'];
export const CONTAINERS: ValueKind[] = ['array', 'tuple', 'set', 'union', 'object'];

// export function makeLeafType(name: string): PropertyType {
//   if (PRIMITIVES.includes(name as any)) return { kind: 'primitive', name: name as any };
//   return { kind: 'custom', name };
// }

// export function makeBuiltInType(name: 'Array'|'Tuple'|'Set', selectedNames: string[]): PropertyType {
//   const survived: string[] = name === 'Array' ? Array.from(new Set(selectedNames)) : name === 'Set' ? [selectedNames[0]] : selectedNames;
//   if (selectedNames.length === 0) return { kind: 'builtIn', name, genericArgs: [{ kind: 'primitive', name: 'any' }] };
//   return { kind: 'builtIn', name, genericArgs: survived.map(n => makeLeafType(n)) };
// }

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

// New schema label generator (fallbacks to legacy type if present)
// Provide optional id->name map (idNameMap) so that entries in valueType which are internal IDs are displayed as the referenced box name.
export function propertyValueLabel(p: Property, idNameMap?: Record<string, string>): string {
  const valueType = (p.valueType || []).map(v => idNameMap && idNameMap[v] ? idNameMap[v] : v);

  switch (p.valueKind) {
    case 'primitive':
      return valueType[0] || 'primitive';
    case 'object':
      return '{…}';
    case 'array': {
      if (valueType.length) {
        return valueType.length === 1 ? `${valueType[0]}[]` : `(${valueType.join(' | ')})[]`;
      }
      return '[]';
    }
    case 'tuple':
      return '[' + (valueType.join(', ') || '') + ']';
    case 'set':
      return `Set<${valueType.join(' | ')}>`;
    case 'union':
      return (p.items?.map(o => propertyValueLabel(o)).join(' | ')) || 'union';
    default:
      return p.valueKind;
  }
}
