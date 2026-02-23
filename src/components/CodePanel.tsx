import Editor from '@monaco-editor/react'

interface CodePanelProps {
  code: string
  onChange: (value: string) => void
}

export function CodePanel({ code, onChange }: CodePanelProps) {
  return (
    <section className="panel code-panel">
      <div className="panel-header">
        <h2>Monaco Editor</h2>
      </div>
      <Editor
        height="100%"
        defaultLanguage="typescript"
        language="typescript"
        value={code}
        onChange={(value) => onChange(value ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbersMinChars: 3,
          automaticLayout: true,
        }}
      />
    </section>
  )
}
