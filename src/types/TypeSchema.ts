// 기본 데이터 모델 (프로토타입)
export type TypeKind = 'interface' | 'type' | 'enum' | 'alias';

export type typeBoxID = `_${string}`;

// New schema design (next-gen property modeling)
export type KeyKind = 'literal' | 'index';
export type ValueKind = 'primitive' | 'object' | 'array' | 'tuple' | 'union' | 'set' | 'map';
// export type BuiltInType = 'Array' | 'Object' | 'Generic' | 'Tuple' | 'Set' | 'Map';
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'any' | 'unknown' | typeBoxID;

/** 
 * 1. ▭ input: literal-object
 * 1. ◻ button: index-object
 * 1. ◯○ input-button: literal-primitive
 * 2. ○ button: primitive-primitive
 */
// Unified Property interface (augmented to support both legacy and new design)
export interface Property {
  // Core identifiers
  id: string;
  // New schema fields (coexist for migration):
  description?: string;     // new description (mirrors comment)
  optional?: boolean;       // optional flag
  readonly?: boolean;       // readonly flag
  // key
  keyKind: KeyKind; key?: string;
  // containers value
  // object/union/map value
  valueKind: ValueKind; items?: Property[];
  // primitive/array/tuple/set value, `_{string}`: custom Type
  valueType: PrimitiveType[];
  
}

export interface TypeBoxModel {
  id: typeBoxID;
  name: string;
  kind: TypeKind;
  properties: Property[];
  position: { x: number; y: number };
  comment?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SchemaGraph {
  boxes: Record<string, TypeBoxModel>;
  order: string[]; // 렌더 순서
  version: number;
  updatedAt: number;
}

export interface SchemaState {
  boxes: Record<string, TypeBoxModel>;
  order: string[];
  // 다중 선택: 선택된 TypeBox id 배열 (빈 배열이면 선택 없음)
  selection: string[];
}

export interface SchemaActions {
  addType: (partial?: Partial<Pick<TypeBoxModel, 'name' | 'kind' | 'properties'>>) => TypeBoxModel;
  updatePosition: (id: string, x: number, y: number) => void;
  // 단일 선택 혹은 additive 토글 (Ctrl/Meta 클릭 시 additive=true)
  select: (id: string | null, options?: { additive?: boolean }) => void;
  selectProperty?: (propId: string | null) => void;
  updateBox: (id: string, partial: Partial<Omit<TypeBoxModel, 'id' | 'createdAt'>>) => void;
  removeBox: (id: string) => void;
  removeBoxes: (ids: string[]) => void;
}

export interface SchemaContextValue extends SchemaGraph, SchemaState, SchemaActions {}

// 분리 컨텍스트 전용 타입
export interface SchemaStateContext {
  boxes: Record<string, TypeBoxModel>;
  order: string[];
  selection: string[];
}

export interface SchemaActionsContext {
  addType: (partial?: Partial<Pick<TypeBoxModel, 'name' | 'kind' | 'properties'>>) => TypeBoxModel;
  updatePosition: (id: string, x: number, y: number) => void;
  select: (id: string | null, options?: { additive?: boolean }) => void;
  selectProperty?: (propId: string | null) => void;
  updateBox: (id: string, partial: Partial<Omit<TypeBoxModel, 'id' | 'createdAt'>>) => void;
  removeBox: (id: string) => void;
  removeBoxes: (ids: string[]) => void;
}

// New split-value types (버전/updatedAt 포함 실시간 변경 최소화 목적)
export interface SchemaStateValue {
  boxes: Record<string, TypeBoxModel>;
  order: string[];
  selection: string[];
  propertySelection?: string | null; // 선택된 Property id (단일)
  version: number;
  updatedAt: number;
}

export interface SchemaActionsValue extends SchemaActions {}

// augment actions at runtime (extended in hook)
declare module './TypeSchema' {}

export interface SchemaStore { state: SchemaStateValue; actions: SchemaActionsValue }
