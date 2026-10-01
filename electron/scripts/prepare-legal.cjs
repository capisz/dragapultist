const fs = require('node:fs/promises')
const path = require('node:path')
const { createHash } = require('node:crypto')

async function prepareLegal() {
  const root = path.join(__dirname, '..')
  const publisher = JSON.parse(await fs.readFile(path.join(root, 'legal/publisher.json'), 'utf8'))
  if (!publisher.operator || !publisher.location || !publisher.version || !publisher.effectiveDate ||
      typeof publisher.contactEmail !== 'string' || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(publisher.contactEmail)) {
    throw Error('Finish legal/publisher.json with the confirmed operator, location, contact email, document version, and effective date before packaging.')
  }
  const values = { OPERATOR: publisher.operator, LOCATION: publisher.location, CONTACT_EMAIL: publisher.contactEmail,
    VERSION: publisher.version, EFFECTIVE_DATE: publisher.effectiveDate }
  const documents = []
  for (const [id, title] of [['terms', 'Beta Terms and Software License'], ['privacy', 'Privacy Notice']]) {
    const template = await fs.readFile(path.join(root, 'legal', `${id}.txt`), 'utf8')
    const text = template.replace(/\{\{([A-Z_]+)\}\}/g, (_match, key) => {
      if (!Object.hasOwn(values, key)) throw Error(`Unknown legal placeholder: ${key}`)
      return values[key]
    })
    if (/\{\{|\}\}|\[.*(?:REQUIRED|EMAIL|OPERATOR|DATE).*\]/i.test(text)) throw Error(`Unfinished ${id} document`)
    documents.push({ id, title, text, sha256: createHash('sha256').update(text).digest('hex') })
  }
  const digest = createHash('sha256').update(JSON.stringify({ version: publisher.version, documents })).digest('hex')
  const output = path.join(root, 'legal/generated')
  await fs.mkdir(output, { recursive: true })
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({ ...publisher, digest, documents }, null, 2) + '\n')
  const introduction = 'DRAGAPULTIST PRIVATE BETA\n\nFree beta. No donations, ads, subscriptions, purchases, or payments.\n\nBy selecting Agree, you accept the Beta Terms and Software License below and acknowledge that the Privacy Notice has been provided. Clipboard capture stays off until you separately enable it. If you do not accept, select Disagree and do not use this beta.\n\n'
  await fs.writeFile(path.join(output, 'installer-license.txt'), introduction + documents.map(d => d.text).join('\n\n----------------------------------------\n\n'))
  for (const document of documents) await fs.writeFile(path.join(output, `${document.id}.txt`), document.text)
  const electronDist = path.join(path.dirname(require.resolve('electron/package.json')), 'dist')
  await fs.copyFile(path.join(electronDist, 'LICENSE'), path.join(output, 'Electron-LICENSE.txt'))
  await fs.copyFile(path.join(electronDist, 'LICENSES.chromium.html'), path.join(output, 'Chromium-NOTICES.html'))
  console.log(`Prepared legal documents ${publisher.version} (${digest.slice(0, 12)}).`)
}

module.exports = prepareLegal
if (require.main === module) prepareLegal().catch(error => { console.error(error.message); process.exitCode = 1 })
