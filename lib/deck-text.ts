import { MAX_DECK_TEXT_LENGTH } from './deck-import-security'

/** Repair percent-encoded clipboard text; validation still runs on the result. */
export function normalizeDeckText(value: string): string {
  if (value.length > MAX_DECK_TEXT_LENGTH * 3) return value
  let text = value
  for (let depth = 0; depth < 2 && /%(?:25)?(?:20|0a|0d)/i.test(text); depth++) {
    try { text = decodeURIComponent(text) } catch { break }
  }
  return text.replace(/\r\n?/g, '\n')
}

export async function copyDeckText(value: string): Promise<void> {
  const text = normalizeDeckText(value)
  if (navigator.clipboard && window.isSecureContext) {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({'text/plain': new Blob([text], {type:'text/plain'})})])
    } else await navigator.clipboard.writeText(text)
    return
  }
  // Local phone demos use HTTP, where the modern clipboard API is unavailable.
  const field = document.createElement('textarea')
  field.value = text
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'
  const focused = document.activeElement as HTMLElement | null
  document.body.appendChild(field)
  field.focus(); field.select(); field.setSelectionRange(0, text.length)
  try {
    if (!document.execCommand('copy')) throw new Error('Clipboard unavailable. Use this deck directly instead.')
  } finally {
    field.remove(); focused?.focus()
  }
}
