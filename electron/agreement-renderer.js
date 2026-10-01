const byId = id => document.getElementById(id)
const api = window.dragapultistAgreement
let manifest = null
let busy = false

function showError(message) {
  byId('error').textContent = message
  byId('error').hidden = false
}
function updateButton() {
  byId('accept').disabled = busy || !manifest || (!manifest.readOnly && (!byId('agree-terms').checked || !byId('acknowledge-privacy').checked))
}
function showDocument(id) {
  const source = manifest.documents.find(item => item.id === id)
  if (!source) return
  const article = byId('document')
  article.replaceChildren()
  article.setAttribute('aria-label', source.title)
  for (const [index, block] of source.text.trim().split(/\n\s*\n/).entries()) {
    const element = document.createElement(index === 0 || /^\d+\. [^\n]+$/.test(block) ? 'h2' : 'p')
    element.textContent = block
    article.append(element)
  }
  article.scrollTop = 0
  article.setAttribute('aria-busy', 'false')
  for (const docId of ['terms', 'privacy']) byId(docId).setAttribute('aria-pressed', String(docId === id))
}

for (const id of ['terms', 'privacy']) byId(id).addEventListener('click', () => { if (manifest) showDocument(id) })
for (const id of ['agree-terms', 'acknowledge-privacy']) byId(id).addEventListener('change', updateButton)
byId('decline').addEventListener('click', () => api.decline().catch(() => showError('Close this window to quit without accepting.')))
byId('accept').addEventListener('click', async () => {
  if (busy || !manifest) return
  if (manifest.readOnly) { await api.close(); return }
  busy = true
  byId('accept').textContent = 'Saving your choice…'
  byId('decline').disabled = true
  updateButton()
  try {
    await api.accept({ termsAccepted: byId('agree-terms').checked, privacyAcknowledged: byId('acknowledge-privacy').checked })
  } catch {
    showError('Your agreement could not be saved. Try again, or decline and quit.')
    busy = false
    byId('accept').textContent = 'Agree and continue'
    byId('decline').disabled = false
    updateButton()
  }
})

async function initialize() {
  try {
    manifest = await api.documents()
    byId('publisher').textContent = `${manifest.operator} · ${manifest.location} · ${manifest.contactEmail}`
    byId('version').textContent = `Agreement ${manifest.version}`
    byId('agree-terms').disabled = false
    byId('acknowledge-privacy').disabled = false
    if (manifest.readOnly) {
      byId('heading').textContent = 'Beta terms & privacy'
      byId('introduction').textContent = 'The documents included with this version of Dragapultist.'
      byId('choices').hidden = true
      byId('decline').hidden = true
      byId('accept').textContent = 'Done'
    }
    showDocument('terms')
    updateButton()
  } catch {
    showError('The included documents could not be opened. Quit and download an updated installer from the publisher.')
  }
}
void initialize()
