"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp } from "@/app/actions"
import { FaGoogle, FaFacebook, FaYahoo } from "react-icons/fa"

interface SignUpFormProps {
  onSuccess: () => void
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  // Add state for button animation
  const [isSignUpButtonPressed, setIsSignUpButtonPressed] = useState(false)
  const [isSocialButtonPressed, setSocialButtonPressed] = useState<string | null>(null)
  const router = useRouter()

  // Update the handleSubmit function to include button animation
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSignUpButtonPressed(true)
    setLoading(true)

    try {
      const form = event.currentTarget
      const formData = new FormData(form)

      console.log("Form data before submission:", Object.fromEntries(formData))

      const response = await signUp(formData)

      console.log("Sign up response:", response)

      if (response.success) {
        console.log("Sign up successful:", response.message)
        router.refresh()
        onSuccess()
      } else {
        console.error("Sign up failed:", response.message)
        setError(response.message)
        setIsSignUpButtonPressed(false)
      }
    } catch (err) {
      console.error("Sign up error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.")
      setIsSignUpButtonPressed(false)
    } finally {
      setLoading(false)
    }
  }

  // Update the social login handlers
  const handleSocialSignUpWithAnimation = (provider: string) => {
    setSocialButtonPressed(provider)
    setTimeout(() => {
      setSocialButtonPressed(null)
      console.log(`${provider} signup`)
    }, 150)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
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
        <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
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
      {/* Update the Sign Up button */}
      <Button
        type="submit"
        className={`w-full bg-blue-400 text-white hover:bg-blue-500 dark:bg-blue-300 dark:hover:bg-blue-400 dark:text-gray-800 shadow-md hover:shadow-lg transition-all ${
          isSignUpButtonPressed ? "scale-95" : "scale-100"
        }`}
        disabled={loading}
      >
        {loading ? "Creating account..." : "Sign Up"}
      </Button>
      <div className="pt-4">
        <div className="flex justify-between items-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-6WFmcA74FjlYCwGZhPiiCBWbpIMvym.png"
            alt="Ghost Pokemon with pumpkin head"
            className="w-16 h-16 object-contain"
          />
          <div className="flex space-x-4">
            {/* Update the social signup buttons */}
            <Button
              type="button"
              variant="outline"
              className={`rounded-full p-2 bg-[#4285F4] hover:bg-[#4285F4]/90 shadow-md hover:shadow-lg transition-all transform hover:scale-105 ${
                isSocialButtonPressed === "google" ? "scale-95" : "scale-100"
              }`}
              onClick={() => handleSocialSignUpWithAnimation("google")}
            >
              <FaGoogle className="w-6 h-6 text-white" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`rounded-full p-2 bg-[#3b5998] hover:bg-[#3b5998]/90 shadow-md hover:shadow-lg transition-all transform hover:scale-105 ${
                isSocialButtonPressed === "facebook" ? "scale-95" : "scale-100"
              }`}
              onClick={() => handleSocialSignUpWithAnimation("facebook")}
            >
              <FaFacebook className="w-6 h-6 text-white" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`rounded-full p-2 bg-[#720e9e] hover:bg-[#720e9e]/90 shadow-md hover:shadow-lg transition-all transform hover:scale-105 ${
                isSocialButtonPressed === "yahoo" ? "scale-95" : "scale-100"
              }`}
              onClick={() => handleSocialSignUpWithAnimation("yahoo")}
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
