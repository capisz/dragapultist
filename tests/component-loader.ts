import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import ts from 'typescript'

const require = createRequire(import.meta.url)

// Next preserves JSX; compile just the component under test with React's JSX runtime.
export function loadComponent<T>(file: string, imports: Record<string, unknown>): T {
  const compiled = { exports: {} }
  const output = ts.transpileModule(readFileSync(resolve(process.cwd(), 'components', file), 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  new Function('module', 'exports', 'require', output)(compiled, compiled.exports, (name: string) => name in imports ? imports[name] : require(name))
  return compiled.exports as T
}
