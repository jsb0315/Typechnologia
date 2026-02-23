export type Source = 'code' | 'diagram'

export interface TypeProperty {
  name: string
  type: string
}

export interface TypeNode {
  id: string
  name: string
  kind: 'interface' | 'type'
  properties: TypeProperty[]
  extends: string[]
}

export interface AppState {
  source: Source
  nodes: TypeNode[]
  code: string
}
