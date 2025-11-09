"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-to-t from-[#FFFAF0] to-[#FFFFFE] dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-gray-100 pt-10">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "signup")}>
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-[#2A2F38] mt-2 rounded-md overflow-hidden p-1 relative">
            <span
              className="absolute bottom-0 h-[calc(100%-8px)] bg-[#1E2328] dark:bg-[#1E2328] rounded-md transition-all duration-300 ease-in-out shadow-md"
              style={{ ...indicatorStyle, top: "4px" }}
            />
            <TabsTrigger
              value="login"
              className="relative z-10 data-[state=active]:text-gray-700 dark:data-[state=active]:text-white rounded-md transition-all duration-200 focus:outline-none"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="relative z-10 data-[state=active]:text-gray-700 dark:data-[state=active]:text-white rounded-md transition-all duration-200 focus:outline-none"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm onSuccess={handleSuccess} onGuestLogin={handleGuestLogin} />
          </TabsContent>
          <TabsContent value="signup">
            <SignUpForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
