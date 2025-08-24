/*
  Bidirectional conversion utilities between internal Property / PropertyType model
  and TypeScript source fragments.
  Scope: primitives, custom identifiers, union (|), intersection (&), array (T[]),
  tuple ([A, B, ...]), built-ins: Array<T>, Set<T>, Map<K,V>, Record<K,V>, Object, Tuple<...>.
  NOTE: This is a lightweight parser – not a full TypeScript AST. It handles a
  controlled subset adequate for the visual builder and round‑trip during prototype phase.
*/

import type { Property, PropertyType, PrimitiveType, BuiltInType, TypeBoxModel } from '../types/TypeSchema';

// -------------------- Serialization (Model -> TS) --------------------

export function propertyTypeToTs(t: PropertyType): string {
  switch (t.kind) {
    case 'primitive':
    case 'custom':
      return t.name;
    case 'union':
      return t.types.map(propertyTypeToTs).join(' | ');
    case 'intersection':
      return t.types.map(propertyTypeToTs).join(' & ');
    case 'builtIn': {
      const args = t.genericArgs || [];
      switch (t.name as BuiltInType) {
        case 'Array':
          if (args.length === 1 && ['primitive', 'custom', 'builtIn'].includes(args[0].kind)) {
            return propertyTypeToTs(args[0]) + '[]';
          }
          return `Array<${args.map(propertyTypeToTs).join(', ')}>`;
        case 'Tuple':
          return `[${args.map(propertyTypeToTs).join(', ')}]`;
        case 'Set':
          return `Set<${args[0] ? propertyTypeToTs(args[0]) : 'unknown'}>`;
        case 'Map':
          return `Map<${args[0] ? propertyTypeToTs(args[0]) : 'unknown'}, ${args[1] ? propertyTypeToTs(args[1]) : 'unknown'}>`;
        case 'Object':
          return `Record<${args[0] ? propertyTypeToTs(args[0]) : 'string'}, ${args[1] ? propertyTypeToTs(args[1]) : 'unknown'}>`;
        case 'Generic':
          return `Generic<${args.map(propertyTypeToTs).join(', ')}>`;
        default:
          return t.name + (args.length ? `<${args.map(propertyTypeToTs).join(', ')}>` : '');
      }
    }
    default:
      return 'any';
  }
}

export function serializeProperty(prop: Property): string {
  const head: string[] = [];
  if (prop.readonly) head.push('readonly');
  head.push(prop.name + (prop.optional ? '?' : ''));
  head.push(':');
  head.push(propertyTypeToTs(prop.type));
  return head.join(' ') + ';';
}

export function boxToTypeScript(box: TypeBoxModel): string {
  const lines: string[] = [];
  if (box.comment) {
    lines.push('/**');
    box.comment.split(/\r?\n/).forEach(l => lines.push(' * ' + l));
    lines.push(' */');
  }
  const header = box.kind === 'interface'
    ? `interface ${box.name}${box.extends?.length ? ' extends ' + box.extends.join(', ') : ''} {`
    : box.kind === 'enum'
      ? `enum ${box.name} {` // enum values not modelled yet
      : box.kind === 'alias' || box.kind === 'type'
        ? `type ${box.name} = ${composeAliasRoot(box)};`
        : `interface ${box.name} {`;

  if (box.kind === 'type' || box.kind === 'alias') {
    return lines.concat(header).join('\n');
  }

  lines.push(header);
  box.properties.forEach(p => {
    if (p.comment) {
      lines.push('  /** ' + p.comment.replace(/\*\//g, '* /') + ' */');
    }
    lines.push('  ' + serializeProperty(p));
  });
  lines.push('}');
  return lines.join('\n');
}

function composeAliasRoot(box: TypeBoxModel): string {
  if (box.unionTypes?.length) return box.unionTypes.join(' | ');
  if (box.intersectionTypes?.length) return box.intersectionTypes.join(' & ');
  // fallback object literal
  if (box.properties.length) {
    return '{ ' + box.properties.map(p => serializeProperty(p).replace(/;$/, '')).join('; ') + ' }';
  }
  return 'unknown';
}

// -------------------- Parsing (TS -> Model) --------------------

const PRIMITIVES: PrimitiveType[] = ['string', 'number', 'boolean', 'null', 'undefined', 'any', 'unknown'];

// Tokenize top-level by a delimiter (| or &) respecting bracket / angle / paren nesting
function splitTopLevel(src: string, delimiter: '|' | '&'): string[] {
  const parts: string[] = []; let depth = 0; let token = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '<' || ch === '(' || ch === '[') depth++;
    else if (ch === '>' || ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === delimiter && depth === 0) {
      parts.push(token.trim()); token = ''; continue;
    }
    token += ch;
  }
  if (token.trim()) parts.push(token.trim());
  return parts;
}

function parseTuple(inner: string): PropertyType {
  const elems = splitTopLevelCommas(inner).map(s => tsToPropertyType(s.trim()));
  return { kind: 'builtIn', name: 'Tuple', genericArgs: elems };
}

function splitTopLevelCommas(src: string): string[] {
  const parts: string[] = []; let depth = 0; let current = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '<' || ch === '(' || ch === '[') depth++;
    else if (ch === '>' || ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

export function tsToPropertyType(raw: string): PropertyType {
  let src = raw.trim();
  if (!src) return { kind: 'primitive', name: 'any' };

  // Array suffix notation: recurse while trailing [] exists
  const arraySuffix = /^(.*?)(\[\])+$/;
  if (arraySuffix.test(src)) {
    const base = src.replace(/(\[\])+$/,'');
    const depth = (src.match(/\[\]/g) || []).length;
    let node = tsToPropertyType(base);
    for (let i = 0; i < depth; i++) {
      node = { kind: 'builtIn', name: 'Array', genericArgs: [node] };
    }
    return node;
  }

  // Tuple literal [A, B]
  if (src.startsWith('[') && src.endsWith(']')) {
    const inner = src.slice(1, -1).trim();
    if (!inner) return { kind: 'builtIn', name: 'Tuple', genericArgs: [] };
    return parseTuple(inner);
  }

  // Union / Intersection (union takes precedence split first)
  if (src.includes('|')) {
    const parts = splitTopLevel(src, '|');
    if (parts.length > 1) return { kind: 'union', types: parts.map(tsToPropertyType) };
  }
  if (src.includes('&')) {
    const parts = splitTopLevel(src, '&');
    if (parts.length > 1) return { kind: 'intersection', types: parts.map(tsToPropertyType) };
  }

  // Generic forms: Name<...>
  const genericMatch = /^([A-Za-z_$][\w$]*)<(.+)>$/.exec(src);
  if (genericMatch) {
    const name = genericMatch[1];
    const inner = genericMatch[2];
    const argStrings = splitTopLevelCommas(inner);
    const args = argStrings.map(a => tsToPropertyType(a));
    switch (name) {
      case 'Array': return { kind: 'builtIn', name: 'Array', genericArgs: args.slice(0,1) };
      case 'Set': return { kind: 'builtIn', name: 'Set', genericArgs: args.slice(0,1) };
      case 'Map': return { kind: 'builtIn', name: 'Map', genericArgs: [args[0] || { kind: 'primitive', name: 'unknown' }, args[1] || { kind: 'primitive', name: 'unknown' }] };
      case 'Record': return { kind: 'builtIn', name: 'Object', genericArgs: [args[0] || { kind: 'primitive', name: 'string' }, args[1] || { kind: 'primitive', name: 'unknown' }] };
      case 'Tuple': return { kind: 'builtIn', name: 'Tuple', genericArgs: args };
      default: return { kind: 'custom', name }; // Treat unknown generic root as custom type (simplification)
    }
  }

  // Primitives
  if (PRIMITIVES.includes(src as PrimitiveType)) {
    return { kind: 'primitive', name: src as PrimitiveType };
  }

  // Built-in single keywords
  if (src === 'Object') return { kind: 'builtIn', name: 'Object' };
  if (src === 'Map') return { kind: 'builtIn', name: 'Map' }; // no generics specified -> unknown,unknown on generation

  // Fallback custom
  return { kind: 'custom', name: src };
}

// Parse a single property line e.g. "readonly foo?: string[];" (comments stripped beforehand)
export function parsePropertyLine(line: string): Property | null {
  const trimmed = line.trim().replace(/;$/, '');
  if (!trimmed) return null;
  const match = /^(readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/.exec(trimmed);
  if (!match) return null;
  const [, ro, name, opt, typeSrc] = match;
  return {
    id: Math.random().toString(36).slice(2),
    name,
    optional: !!opt,
    readonly: !!ro,
    type: tsToPropertyType(typeSrc.trim())
  };
}

// Parse interface or type literal (very small subset) into box skeleton
export function parseBoxFromCode(code: string): Partial<TypeBoxModel> | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  // Extract comment block
  let comment: string | undefined;
  let body = trimmed;
  const commentMatch = /^\/\*\*([\s\S]*?)\*\/\s*/.exec(trimmed);
  if (commentMatch) {
    comment = commentMatch[1].split(/\r?\n/).map(l => l.replace(/^\s*\* ?/, '')).join('\n').trim();
    body = trimmed.slice(commentMatch[0].length).trim();
  }

  // interface
  let m = /^interface\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([A-Za-z0-9_,\s]+))?\s*{([\s\S]*)}$/.exec(body);
  if (m) {
    const name = m[1];
    const extendsList = m[2]?.split(',').map(s => s.trim()).filter(Boolean);
    const inside = m[3];
    const props: Property[] = [];
    inside.split(/\n/).forEach(l => {
      const withoutComment = l.replace(/\/\/.*$/, '').trim();
      if (!withoutComment) return;
      const p = parsePropertyLine(withoutComment);
      if (p) props.push(p);
    });
    return { id: '', name, kind: 'interface', properties: props, position: { x: 0, y: 0 }, extends: extendsList, comment, createdAt: Date.now(), updatedAt: Date.now() } as any;
  }

  // type alias (union / intersection / object literal)
  m = /^type\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]+)$/.exec(body);
  if (m) {
    const name = m[1];
    const rhs = m[2];
    // object literal { ... }
    const objMatch = /^\{([\s\S]*)\}$/.exec(rhs.trim());
    let properties: Property[] = [];
    let unionTypes: string[] | undefined;
    let intersectionTypes: string[] | undefined;
    if (objMatch) {
      const inside = objMatch[1];
      inside.split(/\n/).forEach(l => {
        const line = l.replace(/\/\/.*$/, '').trim();
        if (!line) return;
        const p = parsePropertyLine(line);
        if (p) properties.push(p);
      });
    } else if (rhs.includes('|')) {
      unionTypes = splitTopLevel(rhs, '|');
    } else if (rhs.includes('&')) {
      intersectionTypes = splitTopLevel(rhs, '&');
    }
    return { id: '', name, kind: 'type', properties, unionTypes, intersectionTypes, position: { x: 0, y: 0 }, comment, createdAt: Date.now(), updatedAt: Date.now() } as any;
  }

  return null; // unsupported form currently
}

// Convenience: regenerate TS for box & properties diffing
export function regenerateTs(box: TypeBoxModel): string {
  return boxToTypeScript(box);
}
