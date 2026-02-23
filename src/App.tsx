import { useState } from 'react'
import './App.css'
import { CodePanel } from './components/CodePanel'
import { DiagramPanel } from './components/DiagramPanel'
import type { AppState, TypeNode } from './model'
import { INITIAL_CODE, parseCodeToNodes, serializeNodesToCode } from './utils/typeSync'

function App() {
  const [state, setState] = useState<AppState>(() => ({
    source: 'code',
    code: INITIAL_CODE,
    nodes: parseCodeToNodes(INITIAL_CODE),
  }))

  const onCodeChange = (nextCode: string) => {
    const nextSource: AppState['source'] = 'code'
    const nextNodes = parseCodeToNodes(nextCode)

    setState((prev) => ({
      ...prev,
      source: nextSource,
      code: nextCode,
      nodes: nextNodes,
    }))
  }

  const onDiagramChange = (nextNodes: TypeNode[]) => {
    const nextSource: AppState['source'] = 'diagram'
    const nextCode = serializeNodesToCode(nextNodes)

    setState((prev) => ({
      ...prev,
      source: nextSource,
      nodes: nextNodes,
      code: nextCode,
    }))
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Typechnologia</h1>
        <p>Bidirectional TypeScript Type Editor Prototype</p>
        <p className="source-indicator">active source: {state.source}</p>
      </header>
      <div className="panel-grid">
        <CodePanel code={state.code} onChange={onCodeChange} />
        <DiagramPanel nodes={state.nodes} onChange={onDiagramChange} />
      </div>
    </main>
  )
}

export default App
