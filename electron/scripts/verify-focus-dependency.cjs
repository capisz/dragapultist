const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const root = path.dirname(require.resolve('get-windows'))
if (process.platform === 'darwin') fs.accessSync(path.join(root, 'main'), fs.constants.X_OK)
else if (process.platform === 'win32') {
  const requireFocus = createRequire(path.join(root, 'index.js'))
  const binding = requireFocus('@mapbox/node-pre-gyp').find(path.join(root, 'package.json'))
  const native = require(binding)
  if (typeof native.getActiveWindow !== 'function') throw Error('The game-focus binding is unavailable')
}
console.log(`Verified ${process.platform} game-focus runtime files; no window contents were read.`)
