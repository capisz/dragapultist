const fs = require('node:fs'), path = require('node:path'), { createHash } = require('node:crypto')
const dir = path.join(__dirname, '..', 'dist')
const names = fs.readdirSync(dir).filter(n => /\.(exe|dmg)$/.test(n)).sort()
fs.writeFileSync(path.join(dir, 'SHA256SUMS.txt'), names.map(n => `${createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')}  ${n}`).join('\n')+'\n')
