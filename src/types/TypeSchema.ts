// 기본 데이터 모델 (프로토타입)
export type TypeKind = 'interface' | 'type' | 'enum' | 'alias';

export interface Property {
  id: string;
  name: string;
  type: string;
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
  selection: string | null;
}

export interface SchemaActions {
  addType: (partial?: Partial<Pick<TypeBoxModel, 'name' | 'kind' | 'properties'>>) => TypeBoxModel;
  updatePosition: (id: string, x: number, y: number) => void;
  select: (id: string | null) => void;
  updateBox: (id: string, partial: Partial<Omit<TypeBoxModel, 'id' | 'createdAt'>>) => void;
}

export interface SchemaContextValue extends SchemaGraph, SchemaState, SchemaActions {}

// 분리 컨텍스트 전용 타입
export interface SchemaStateContext {
  boxes: Record<string, TypeBoxModel>;
  order: string[];
  selection: string | null;
}

export interface SchemaActionsContext {
  addType: (partial?: Partial<Pick<TypeBoxModel, 'name' | 'kind' | 'properties'>>) => TypeBoxModel;
  updatePosition: (id: string, x: number, y: number) => void;
  select: (id: string | null) => void;
  updateBox: (id: string, partial: Partial<Omit<TypeBoxModel, 'id' | 'createdAt'>>) => void;
}
