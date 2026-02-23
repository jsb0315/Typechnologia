import { createSystem } from '@typescript/vfs'
import * as ts from 'typescript'
import type { TypeNode } from '../model'

const DEFAULT_CODE = `interface Person {
  name: string;
  age: number;
}

interface Employee extends Person {
  team: string;
}

type Audit = {
  createdAt: string;
}

type Profile = Employee & Audit & {
  nickname: string;
}`

function getPropertyName(name: ts.PropertyName, sourceFile: ts.SourceFile): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }

  return name.getText(sourceFile)
}

function parseMembers(
  members: readonly ts.TypeElement[],
  sourceFile: ts.SourceFile,
): { name: string; type: string }[] {
  return members
    .filter((member): member is ts.PropertySignature => ts.isPropertySignature(member))
    .map((member) => ({
      name: getPropertyName(member.name, sourceFile),
      type: member.type?.getText(sourceFile) ?? 'unknown',
    }))
}

function parseTypeAliasShape(
  typeNode: ts.TypeNode,
  sourceFile: ts.SourceFile,
): { properties: { name: string; type: string }[]; extendsRefs: string[] } {
  if (ts.isTypeLiteralNode(typeNode)) {
    return { properties: parseMembers(typeNode.members, sourceFile), extendsRefs: [] }
  }

  if (!ts.isIntersectionTypeNode(typeNode)) {
    return { properties: [], extendsRefs: [] }
  }

  const properties: { name: string; type: string }[] = []
  const extendsRefs: string[] = []

  for (const part of typeNode.types) {
    if (ts.isTypeLiteralNode(part)) {
      properties.push(...parseMembers(part.members, sourceFile))
      continue
    }

    if (ts.isTypeReferenceNode(part)) {
      extendsRefs.push(part.typeName.getText(sourceFile))
    }
  }

  return { properties, extendsRefs }
}

export function parseCodeToNodes(code: string): TypeNode[] {
  try {
    const files = new Map<string, string>()
    files.set('/index.ts', code)
    const system = createSystem(files)
    const sourceText = system.readFile('/index.ts') ?? code
    const sourceFile = ts.createSourceFile('/index.ts', sourceText, ts.ScriptTarget.Latest, true)

    const nodes: TypeNode[] = []

    sourceFile.forEachChild((statement) => {
      if (ts.isInterfaceDeclaration(statement)) {
        const extendsRefs = statement.heritageClauses
          ?.filter((clause) => clause.token === ts.SyntaxKind.ExtendsKeyword)
          .flatMap((clause) => clause.types.map((item) => item.expression.getText(sourceFile))) ?? []

        nodes.push({
          id: `interface-${statement.name.text}-${nodes.length}`,
          name: statement.name.text,
          kind: 'interface',
          properties: parseMembers(statement.members, sourceFile),
          extends: extendsRefs,
        })
      }

      if (ts.isTypeAliasDeclaration(statement)) {
        const shape = parseTypeAliasShape(statement.type, sourceFile)

        nodes.push({
          id: `type-${statement.name.text}-${nodes.length}`,
          name: statement.name.text,
          kind: 'type',
          properties: shape.properties,
          extends: shape.extendsRefs,
        })
      }
    })

    return nodes
  } catch {
    return []
  }
}

function serializeProperties(properties: { name: string; type: string }[]): string {
  if (properties.length === 0) {
    return ''
  }

  return properties.map((property) => `  ${property.name}: ${property.type};`).join('\n') + '\n'
}

export function serializeNodesToCode(nodes: TypeNode[]): string {
  return nodes
    .map((node) => {
      const properties = serializeProperties(node.properties)

      if (node.kind === 'interface') {
        const extendsClause = node.extends.length > 0 ? ` extends ${node.extends.join(', ')}` : ''
        return `interface ${node.name}${extendsClause} {\n${properties}}`
      }

      if (node.extends.length > 0) {
        const refs = node.extends.join(' & ')
        return `type ${node.name} = ${refs} & {\n${properties}};`
      }

      return `type ${node.name} = {\n${properties}};`
    })
    .join('\n\n')
}

export const INITIAL_CODE = DEFAULT_CODE
