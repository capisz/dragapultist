const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Inspect the real component's sibling identities without a DOM dependency.
function spritePair({ user, opponent }) {
  const component = path.join(__dirname, '../components/matchup-sprite-pair.tsx')
  const output = ts.transpileModule(fs.readFileSync(component, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: component,
  }).outputText
  const compiled = { exports: {} }
  const mockRequire = name => {
    if (name === './match-sprite') return { MatchSprite: () => null }
    return require(name)
  }
  new Function('module', 'exports', 'require', output)(compiled, compiled.exports, mockRequire)
  const tree = compiled.exports.MatchupSpritePair({ user, opponent })
  return tree.props.children.filter(child => child.props.role === 'img')
}

test('mirror matches retain distinct identities and use the shared still sprite', () => {
  for (const name of ['Dragapult ex', 'Charizard ex', 'Mega Kangaskhan ex', '']) {
    const pair = spritePair({ user: name, opponent: name })
    assert.equal(pair.length, 2)
    assert.notEqual(pair[0].key, pair[1].key, `${name}: duplicate sibling keys`)
    assert.deepEqual(pair.map(sprite => sprite.props.children.props.name), [name, name])
    assert.deepEqual(pair.map(sprite => sprite.props['aria-label']), Array(2).fill(name || 'Unknown Pokémon'))
  }
})

test('ordinary renders keep both still sprites stable', () => {
  const names = { user: 'Dragapult ex', opponent: 'Dragapult ex' }
  assert.deepEqual(spritePair(names).map(sprite => sprite.key), spritePair(names).map(sprite => sprite.key))
})

test('a matchup edit resets only the changed side, including changing into a mirror match', () => {
  const initial = spritePair({ user: 'Dragapult ex', opponent: 'Charizard ex' })
  const edited = spritePair({ user: 'Dragapult ex', opponent: 'Dragapult ex' })
  assert.equal(edited[0].key, initial[0].key)
  assert.notEqual(edited[1].key, initial[1].key)
  assert.notEqual(edited[0].key, edited[1].key)
})
