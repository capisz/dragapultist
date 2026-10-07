const fs = require('node:fs')
const path = require('node:path')
const asar = require('@electron/asar')

module.exports = async context => {
  const resources = context.packager.getResourcesDir(context.appOutDir)
  const archive = path.join(resources, 'app.asar')
  for (const file of ['main.js', 'preload.js', 'startup.cjs', 'agreement.cjs', 'agreement-preload.js', 'agreement-renderer.js', 'agreement.html', 'agreement.css', 'legal/generated/manifest.json', 'assets/icon.png', 'game-focus.cjs', 'overlay.cjs', 'overlay-model.cjs', 'overlay-preload.js', 'overlay.html', 'overlay.css', 'overlay-renderer.js', 'assets/overlay-font.woff2', 'assets/OVERLAY-FONT-OFL.txt', 'node_modules/get-windows/package.json']) {
    if (!asar.extractFile(archive, path.normalize(file)).length) throw Error(`Missing packaged overlay file: ${file}`)
  }
  if (!asar.extractFile(archive, path.normalize('assets/icon.png')).equals(fs.readFileSync(path.join(__dirname, '..', 'assets/icon.png')))) throw Error('Packaged app icon does not match the selected source image')
  const manifest = JSON.parse(asar.extractFile(archive, path.normalize('legal/generated/manifest.json')))
  if (manifest.documents?.length !== 2 || !manifest.contactEmail || !manifest.digest) throw Error('Packaged first-run agreement is incomplete')
  const dependency = JSON.parse(asar.extractFile(archive, path.normalize('node_modules/get-windows/package.json')))
  if (dependency.version !== '9.3.0') throw Error('Unexpected packaged focus dependency version')
  if (context.electronPlatformName === 'darwin') {
    fs.accessSync(path.join(resources, 'app.asar.unpacked', 'node_modules/get-windows/main'), fs.constants.X_OK)
  } else if (context.electronPlatformName === 'win32') {
    const files = asar.listPackage(archive).map(file => file.replace(/\\/g, '/'))
    const binding = files.find(file => /get-windows\/lib\/binding\/napi-9-win32-[^/]+-x64\/node-get-windows\.node$/.test(file))
    if (!binding) throw Error('Windows installer is missing the native game-focus binding')
    fs.accessSync(path.join(resources, 'app.asar.unpacked', binding.replace(/^\//, '')))
  }
  console.log(`Verified packaged overlay and focus dependency for ${context.electronPlatformName}.`)
}
