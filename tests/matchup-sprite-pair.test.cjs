const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')

// Inspect the real component's sibling identities without a DOM dependency.
function spritePair({ user, opponent, motionAllowed = true, paused = false }) {
  const states = [motionAllowed, paused]
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
    if (name === 'react') return { ...React, useState: () => [states.shift(), () => {}], useEffect: () => {} }
    if (name === './match-sprite') return { MatchSprite: () => null }
    if (name === '@/utils/pokeapi-sprites') return { getPokemonSpriteCandidateSourcesForDisplayName: () => [] }
    if (name === '@/utils/verified-animated-sprites.json') return { assets: {} }
    return require(name)
  }
  new Function('module', 'exports', 'require', output)(compiled, compiled.exports, mockRequire)
  const tree = compiled.exports.MatchupSpritePair({ user, opponent })
  return tree.props.children[0].props.children.filter(child => typeof child.type === 'function')
}

test('mirror matches give each side a distinct sprite identity in every motion state', () => {
  for (const name of ['Dragapult ex', 'Charizard ex', 'Mega Kangaskhan ex', '']) {
    for (const motionAllowed of [true, false]) {
      for (const paused of [true, false]) {
        const pair = spritePair({ user: name, opponent: name, motionAllowed, paused })
        assert.equal(pair.length, 2)
        assert.notEqual(pair[0].key, pair[1].key, `${name}: duplicate sibling keys`)
        assert.deepEqual(pair.map(sprite => sprite.props.name), [name, name])
        assert.deepEqual(pair.map(sprite => sprite.props.animate), Array(2).fill(motionAllowed && !paused))
      }
    }
  }
})

test('toggling motion resets both sprites while ordinary renders retain their identities', () => {
  const names = { user: 'Dragapult ex', opponent: 'Dragapult ex' }
  const animated = spritePair(names).map(sprite => sprite.key)
  const paused = spritePair({ ...names, paused: true }).map(sprite => sprite.key)
  assert.deepEqual(spritePair(names).map(sprite => sprite.key), animated)
  assert.ok(animated.every(key => !paused.includes(key)))
})

test('a matchup edit resets only the changed side, including changing into a mirror match', () => {
  const initial = spritePair({ user: 'Dragapult ex', opponent: 'Charizard ex' })
  const edited = spritePair({ user: 'Dragapult ex', opponent: 'Dragapult ex' })
  assert.equal(edited[0].key, initial[0].key)
  assert.notEqual(edited[1].key, initial[1].key)
  assert.notEqual(edited[0].key, edited[1].key)
})
