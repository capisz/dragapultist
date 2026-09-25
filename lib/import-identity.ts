/** Identity only: never pass collapsed text to the line-oriented game parser. */
export function normalizeImportLog(log: string): string {
  return log.replace(/\s+/g, ' ').trim()
}
