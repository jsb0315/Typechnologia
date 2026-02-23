import type { TypeNode } from '../model'

interface TypeNodeCardProps {
  node: TypeNode
  onEdit: (nextNode: TypeNode) => void
}

export function TypeNodeCard({ node, onEdit }: TypeNodeCardProps) {
  const updateName = (name: string) => {
    onEdit({ ...node, name: name.trim() === '' ? node.name : name })
  }

  const updatePropertyName = (index: number, name: string) => {
    const nextProperties = node.properties.map((property, currentIndex) =>
      currentIndex === index ? { ...property, name } : property,
    )

    onEdit({ ...node, properties: nextProperties })
  }

  const updatePropertyType = (index: number, type: string) => {
    const nextProperties = node.properties.map((property, currentIndex) =>
      currentIndex === index ? { ...property, type } : property,
    )

    onEdit({ ...node, properties: nextProperties })
  }

  const addProperty = () => {
    onEdit({
      ...node,
      properties: [...node.properties, { name: 'newProp', type: 'string' }],
    })
  }

  const removeProperty = (index: number) => {
    onEdit({
      ...node,
      properties: node.properties.filter((_, currentIndex) => currentIndex !== index),
    })
  }

  return (
    <article className="type-node-card">
      <div className="type-node-header">
        <span className="type-kind">{node.kind}</span>
        <input
          value={node.name}
          className="node-name-input"
          onChange={(event) => updateName(event.target.value)}
        />
      </div>
      {node.extends.length > 0 && <p className="extends-label">extends: {node.extends.join(', ')}</p>}
      <div className="properties-list">
        {node.properties.map((property, index) => (
          <div key={`${node.id}-${index}`} className="property-row">
            <input
              value={property.name}
              onChange={(event) => updatePropertyName(index, event.target.value)}
            />
            <span>:</span>
            <input
              value={property.type}
              onChange={(event) => updatePropertyType(index, event.target.value)}
            />
            <button type="button" onClick={() => removeProperty(index)}>
              −
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="add-property" onClick={addProperty}>
        + Add property
      </button>
    </article>
  )
}
