"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthPanel } from "./auth-panel"
import { LoginForm } from "./login-form"
import { SignUpForm } from "./signup-form"
import { loginAsGuest } from "@/app/actions"
import { useRouter } from "next/navigation"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login")
  const [indicatorStyle, setIndicatorStyle] = useState({ left: "2%", width: "46%" })
  const router = useRouter()

  const handleSuccess = () => {
    onSuccess()
    onOpenChange(false)
  }

  const handleGuestLogin = async () => {
    await loginAsGuest()
    onSuccess()
    onOpenChange(false)
    router.refresh()
  }

  useEffect(() => {
    setIndicatorStyle({
      left: activeTab === "login" ? "2%" : "52%",
      width: "46%",
    })
  }, [activeTab])

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="option-a-auth"><AuthPanel onSuccess={handleSuccess} onGuest={handleGuestLogin} /></DialogContent></Dialog>
}
