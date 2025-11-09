"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "@/app/actions"
import { FaGoogle, FaFacebook, FaYahoo } from "react-icons/fa"

interface LoginFormProps {
  onSuccess: () => void
  onGuestLogin: () => void
}

export function LoginForm({ onSuccess, onGuestLogin }: LoginFormProps) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isLoginButtonPressed, setIsLoginButtonPressed] = useState(false)
  const [isGuestButtonPressed, setIsGuestButtonPressed] = useState(false)
  const [isSocialButtonPressed, setSocialButtonPressed] = useState<string | null>(null)
  const router = useRouter()

  const handleGoogleLogin = () => (window.location.href = "https://accounts.google.com/o/oauth2/v2/auth")
  const handleFacebookLogin = () => (window.location.href = "https://www.facebook.com/v12.0/dialog/oauth")
  const handleYahooLogin = () => (window.location.href = "https://api.login.yahoo.com/oauth2/request_auth")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsLoginButtonPressed(true)
    setLoading(true)

    try {
      const form = event.currentTarget
      const formData = new FormData(form)

      console.log("Submitting login form data:", {
        username: formData.get("username"),
        password: formData.get("password"),
      })

      const response = await login(formData)

      if (response.success) {
        console.log("Login successful:", response.message)
        router.refresh()
        onSuccess()
      } else {
        console.error("Login failed:", response.message)
        setError(response.message)
        setIsLoginButtonPressed(false)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.")
      setIsLoginButtonPressed(false)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLoginWithAnimation = () => {
    setIsGuestButtonPressed(true)
    setTimeout(() => {
      setIsGuestButtonPressed(false)
      onGuestLogin()
    }, 150)
  }

  const handleSocialLoginWithAnimation = (provider: string) => {
    setSocialButtonPressed(provider)
    setTimeout(() => {
      setSocialButtonPressed(null)
      if (provider === "google") handleGoogleLogin()
      else if (provider === "facebook") handleFacebookLogin()
      else if (provider === "yahoo") handleYahooLogin()
    }, 150)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <Button
        onClick={handleGuestLoginWithAnimation}
        type="button"
        className={`w-full bg-blue-400 text-white hover:bg-blue-500 dark:bg-blue-300 dark:hover:bg-blue-400 dark:text-gray-800 shadow-md hover:shadow-lg transition-all mb-4 ${
          isGuestButtonPressed ? "scale-95" : "scale-100"
        }`}
      >
        Login as Guest
      </Button>
      <div className="space-y-2">
        <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
          Username
        </Label>
        <Input
          id="username"
          name="username"
          required
          className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md"
        />
      </div>
      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      <Button
        type="submit"
        className={`w-full bg-blue-400 text-white hover:bg-blue-500 dark:bg-blue-300 dark:hover:bg-blue-400 dark:text-gray-800 shadow-md hover:shadow-lg transition-all ${
          isLoginButtonPressed ? "scale-95" : "scale-100"
        }`}
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </Button>
      <div className="pt-4">
        <div className="flex justify-between items-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-6WFmcA74FjlYCwGZhPiiCBWbpIMvym.png"
            alt="Ghost Pokemon with pumpkin head"
            className="w-16 h-16 object-contain"
          />
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              className={`rounded-full p-2 bg-[#4285F4] hover:bg-[#4285F4]/90 shadow-md hover:shadow-lg transition-all transform hover:scale-105 ${
                isSocialButtonPressed === "google" ? "scale-95" : "scale-100"
              }`}
              onClick={() => handleSocialLoginWithAnimation("google")}
            >
              <FaGoogle className="w-6 h-6 text-white" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`rounded-full p-2 bg-[#3b5998] hover:bg-[#3b5998]/90 shadow-md hover:shadow-lg transition-all transform hover:scale-105 ${
                isSocialButtonPressed === "facebook" ? "scale-95" : "scale-100"
              }`}
              onClick={() => handleSocialLoginWithAnimation("facebook")}
            >
              <FaFacebook className="w-6 h-6 text-white" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`rounded-full p-2 bg-[#720e9e] hover:bg-[#720e9e]/90 shadow-md hover:shadow-lg transition-all transform hover:scale-105 ${
                isSocialButtonPressed === "yahoo" ? "scale-95" : "scale-100"
              }`}
              onClick={() => handleSocialLoginWithAnimation("yahoo")}
            >
              <FaYahoo className="w-6 h-6 text-white" />
            </Button>
          </div>
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-vNJrOH25glsL946THYWTPavaayogru.png"
            alt="Hooded ghost Pokemon"
            className="w-16 h-16 object-contain"
          />
        </div>
      </div>
    </form>
  )
}
