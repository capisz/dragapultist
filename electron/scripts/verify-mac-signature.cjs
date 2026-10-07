const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')
const { execFileSync } = require('node:child_process')

function verifyApp(appPath) {
  // Verify the sealed app and nested code, including the unpacked focus helper.
  // This establishes integrity, not Developer ID trust or notarization.
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], { stdio: 'inherit' })
  const helper = path.join(appPath, 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'get-windows', 'main')
  execFileSync('/usr/bin/codesign', ['--verify', '--strict', '--verbose=2', helper], { stdio: 'inherit' })
  console.log('Verified sealed Mac app, nested code and native game-focus helper signatures. Developer ID/notarization acceptance is separate.')
}

module.exports = async context => {
  if (context.electronPlatformName !== 'darwin') return
  verifyApp(path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`))
}

if (require.main === module) {
  if (process.platform !== 'darwin') throw Error('Mac signature verification must run on macOS')
  const config = require('../package.json')
  for (const arch of ['arm64', 'x64']) {
    const image = path.resolve(__dirname, '..', 'dist', `Dragapultist-${config.version}-mac-${arch}.dmg`)
    fs.accessSync(image)
    execFileSync('/usr/bin/hdiutil', ['verify', image], { stdio: 'inherit' })
    const mount = fs.mkdtempSync(path.join(os.tmpdir(), 'dragapultist-signature-'))
    let mounted = false
    try {
      // The installer retains its published license. Accept it for this read-only
      // packaging check so CI can verify the exact app without changing OS policy.
      execFileSync('/usr/bin/hdiutil', ['attach', '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount, image], { input: 'Y\n', stdio: ['pipe', 'inherit', 'inherit'] })
      mounted = true
      verifyApp(path.join(mount, `${config.productName}.app`))
      console.log(`Verified the distributed ${arch} DMG, not just its staging app.`)
    } finally {
      if (mounted) execFileSync('/usr/bin/hdiutil', ['detach', mount], { stdio: 'inherit' })
      fs.rmdirSync(mount)
    }
  }
}
