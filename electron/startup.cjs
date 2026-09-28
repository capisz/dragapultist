const { DurableQueue } = require('./queue.cjs')

async function openSecureQueue(file, safeStorage, { timeoutMs = 15000 } = {}) {
  let timer
  const opening = (async () => {
    if (!await safeStorage.isAsyncEncryptionAvailable()) {
      throw Error('OS encryption is unavailable. Capture is paused. Your saved queue is preserved.')
    }
    const queue = new DurableQueue(file, {
      encrypt: text => safeStorage.encryptStringAsync(text),
      decrypt: async bytes => {
        const decrypted = await safeStorage.decryptStringAsync(bytes)
        if (typeof decrypted?.result !== 'string') throw Error('Invalid secure storage response')
        return decrypted.result
      },
    })
    await queue.load()
    return queue
  })()
  try {
    return await Promise.race([
      opening,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('Secure storage did not respond. Capture is paused. Your saved queue is preserved. Quit and reopen Dragapultist to retry.')), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

module.exports = { openSecureQueue }
