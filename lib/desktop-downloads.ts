import release from '@/docs/releases/desktop-0.3.0-beta.3.json'

// The checked-in release manifest keeps website downloads tied to verified assets.
// Legacy deployment variables may still name an older installer and are no longer used.
export const DESKTOP_INSTALLERS = [
  { target: 'win-x64', label: 'Windows', format: '.exe' },
  { target: 'mac-arm64', label: 'Mac · Apple Silicon', format: '.dmg' },
  { target: 'mac-x64', label: 'Mac · Intel', format: '.dmg' },
].map(item => ({ ...item, url: release.files.find(file => file.target === item.target)?.url }))
