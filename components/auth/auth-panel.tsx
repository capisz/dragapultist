"use client"
import { useState } from 'react'
import { DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { LoginForm } from './login-form'
import { SignUpForm } from './signup-form'

export function AuthPanel({ onSuccess, onGuest }: { onSuccess: () => void; onGuest: () => Promise<void> }) {
  const [tab, setTab] = useState('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function guest() { setBusy(true); setError(''); try { await onGuest() } catch { setError('Guest access is unavailable. Try again.') } finally { setBusy(false) } }
  return <>
    <DialogHeader><DialogTitle>{tab === 'login' ? 'Sign in' : 'Create account'}</DialogTitle><DialogDescription className="sr-only">Access your Dragapultist account or continue as a guest.</DialogDescription></DialogHeader>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="auth-segments"><TabsTrigger value="login">Sign in</TabsTrigger><TabsTrigger value="signup">Create account</TabsTrigger></TabsList>
      <TabsContent value="login"><LoginForm onSuccess={onSuccess} /></TabsContent>
      <TabsContent value="signup"><SignUpForm onSuccess={onSuccess} /></TabsContent>
    </Tabs>
    <button type="button" className="guest-action" disabled={busy} onClick={guest}>{busy ? 'Continuing…' : 'Continue as guest'}</button>
    {error && <p role="alert">{error}</p>}
  </>
}
