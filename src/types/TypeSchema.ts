// 기본 데이터 모델 (프로토타입)
export type TypeKind = 'interface' | 'type' | 'enum' | 'alias';

// 기본 Type 종류 (TS 프리미티브 + any/unknown 확장)
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'any' | 'unknown';
// 빌트인 컨테이너 / 구조 타입 (Generic 은 추후 <T> 표현용 placeholder)
export type BuiltInType = 'Array' | 'Object' | 'Generic' | 'Tuple' | 'Set' | 'Map';
export type CustomType = { name: string; typeDef: any }; // interface/type 이름 및 정의
// Property Type 규칙
// PropertyType: UI <-> TS 소스코드 양방향 변환을 위한 구조화 타입 정의
export type PropertyType =
  | { kind: 'primitive'; name: PrimitiveType }
  | { kind: 'custom'; name: string }
  | { kind: 'union'; types: PropertyType[] }
  | { kind: 'intersection'; types: PropertyType[] }
  | { kind: 'builtIn'; name: BuiltInType; genericArgs?: PropertyType[] };


export interface Property {
  id: string;
  name: string;
  type: PropertyType; // 구조화된 타입 표현
  optional?: boolean;
  readonly?: boolean;
  comment?: string;
}

export interface TypeBoxModel {
  id: string;
  name: string;
  kind: TypeKind;
  properties: Property[];
  position: { x: number; y: number };
  extends?: string[];
  unionTypes?: string[];       // type A = B | C
  intersectionTypes?: string[]; // type A = B & C
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
  updateBox: (id: string, partial: Partial<Omit<TypeBoxModel, 'id' | 'createdAt'>>) => void;
  removeBox: (id: string) => void;
  removeBoxes: (ids: string[]) => void;
}
