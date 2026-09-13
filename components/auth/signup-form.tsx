"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Firebase client sign-up followed by a verified server-session exchange.
import { firebaseSignUp } from "@/lib/firebase-session-client"

interface SignUpFormProps {
  onSuccess?: () => void
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setNotice("")
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await firebaseSignUp(
        String(formData.get("username") || ""),
        String(formData.get("email") || ""),
        String(formData.get("password") || ""),
      )
      if (result.verificationRequired) {
        setNotice("Account created. Check your email, verify it, then sign in.")
      } else {
        router.refresh()
        onSuccess?.()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-slate-700 dark:text-slate-200">
          Username
        </Label>
        <Input
          id="username"
          name="username"
          required
          className={cn(
            "rounded-2xl",
            "bg-slate-50/80 border-slate-200",
            "dark:bg-slate-900/40 dark:border-slate-700",
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          className={cn(
            "rounded-2xl",
            "bg-slate-50/80 border-slate-200",
            "dark:bg-slate-900/40 dark:border-slate-700",
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          className={cn(
            "rounded-2xl",
            "bg-slate-50/80 border-slate-200",
            "dark:bg-slate-900/40 dark:border-slate-700",
          )}
        />
      </div>

      {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full rounded-full",
          "bg-[#5e82ab] text-white hover:bg-[#4f739d] active:bg-[#44678f]",
          "dark:bg-[#b1cce8] dark:text-[#0b1220] dark:hover:bg-[#a1c2e4] dark:active:bg-[#93b7df]",
          "shadow-md hover:shadow-lg transition-all",
        )}
      >
        {loading ? "Creating account..." : "Create account"}
      </Button>
    </form>
  )
}
