"use client"

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { useDesktopSettings } from '@/components/desktop-companion'
import { HeaderPokemonIcon } from './header-pokemon-icon'
import { DESKTOP_INSTALLERS } from '@/lib/desktop-downloads'
import './appearance-settings.css'

function publicInstallerUrl(value?: string) {
  if (!value) return null
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}

export function AppearanceSettings() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const desktop = useDesktopSettings()
  useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === 'dark'

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" variant="ghost" className="header-pokemon-button" aria-label="Settings" title="Klink · Settings"><HeaderPokemonIcon kind="settings" /></Button></DialogTrigger>
    <DialogContent className="appearance-settings-dialog">
      <DialogHeader><DialogTitle>Settings</DialogTitle><DialogDescription>Appearance and the desktop app.</DialogDescription></DialogHeader>
      <section aria-labelledby="appearance-heading">
        <h3 id="appearance-heading">Appearance</h3>
        <div className="pokemon-theme-choice">
          <span>Light<small>Solrock</small></span>
          <button type="button" className="pokemon-theme-switch" role="switch" aria-label="Dark mode" aria-checked={dark} disabled={!mounted} onClick={() => setTheme(dark ? 'light' : 'dark')}>
            <span className="pokemon-theme-thumb" aria-hidden="true" />
            <img src="/pokemon/338.png" alt="" draggable={false} />
            <img src="/pokemon/337.png" alt="" draggable={false} />
          </button>
          <span>Dark<small>Lunatone</small></span>
        </div>
        <label className="system-appearance"><input type="checkbox" checked={mounted && theme === 'system'} disabled={!mounted} onChange={event => setTheme(event.target.checked ? 'system' : dark ? 'dark' : 'light')} />Follow device appearance</label>
        <p className="appearance-hint" role="status">{mounted && theme === 'system' ? `Following your device · ${dark ? 'Dark' : 'Light'} mode` : 'Saved automatically on this device.'}</p>
      </section>
      {mounted && !desktop.available && <section className="beta-downloads" aria-labelledby="beta-download-heading">
        <h3 id="beta-download-heading">Desktop app beta</h3>
        <p className="appearance-hint">{DESKTOP_INSTALLERS.some(item => publicInstallerUrl(item.url)) ? 'Choose the installer for your computer.' : 'Public downloads are coming soon.'}</p>
        <div className="beta-download-options">{DESKTOP_INSTALLERS.map(item => {
          const url = publicInstallerUrl(item.url)
          const content = <><Download aria-hidden="true" size={16} /><span>{item.label}<small>{item.format}{!url ? ' · Coming soon' : ''}</small></span></>
          return url ? <a key={item.label} className="beta-download" href={url} download>{content}</a> : <button key={item.label} type="button" className="beta-download" disabled>{content}</button>
        })}</div>
      </section>}
      {desktop.available && <section className="beta-downloads"><h3>Desktop capture</h3><Button type="button" variant="outline" onClick={() => { setOpen(false); desktop.openSettings() }}>Open desktop settings</Button></section>}
    </DialogContent>
  </Dialog>
}
