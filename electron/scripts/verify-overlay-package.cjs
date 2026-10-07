const fs = require('node:fs')
const path = require('node:path')
const asar = require('@electron/asar')

module.exports = async context => {
  const resources = context.packager.getResourcesDir(context.appOutDir)
  const archive = path.join(resources, 'app.asar')
  for (const file of ['main.js', 'preload.js', 'game-focus.cjs', 'overlay.cjs', 'overlay-model.cjs', 'overlay-preload.js', 'overlay.html', 'overlay.css', 'overlay-renderer.js', 'assets/overlay-font.woff2', 'assets/OVERLAY-FONT-OFL.txt', 'node_modules/get-windows/package.json']) {
    if (!asar.extractFile(archive, file).length) throw Error(`Missing packaged overlay file: ${file}`)
  }
  const dependency = JSON.parse(asar.extractFile(archive, 'node_modules/get-windows/package.json'))
  if (dependency.version !== '9.3.0') throw Error('Unexpected packaged focus dependency version')
  if (context.electronPlatformName === 'darwin') {
    fs.accessSync(path.join(resources, 'app.asar.unpacked', 'node_modules/get-windows/main'), fs.constants.X_OK)
  } else if (context.electronPlatformName === 'win32') {
    const files = asar.listPackage(archive)
    const binding = files.find(file => /get-windows\/lib\/binding\/napi-9-win32-[^/]+-x64\/node-get-windows\.node$/.test(file))
    if (!binding) throw Error('Windows installer is missing the native game-focus binding')
    fs.accessSync(path.join(resources, 'app.asar.unpacked', binding.replace(/^\//, '')))
  }
  console.log(`Verified packaged overlay and focus dependency for ${context.electronPlatformName}.`)
}
