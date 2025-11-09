"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AuthDialog } from "./auth-dialog"
import type { User } from "@/types/auth"
import { logout, getUser } from "@/app/actions"
import { useRouter } from "next/navigation"
import { Montserrat } from "next/font/google"

const montserrat = Montserrat({ subsets: ["latin"] })

export function AuthHeader() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [showGuestNotification, setShowGuestNotification] = useState(true)
  const [showSignOutConfirmation, setShowSignOutConfirmation] = useState(false)
  const router = useRouter()
  const accountUrl = "/account" // You can change this to the actual account page URL

  useEffect(() => {
    const isDarkMode = localStorage.getItem("darkMode") === "true"
    setDarkMode(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    }

    // Fetch the user on component mount
    getUser().then((fetchedUser) => {
      setUser(fetchedUser)
      const isGuestUser = fetchedUser?.username === "Guest"
      setIsGuest(isGuestUser)
      setShowGuestNotification(isGuestUser)
    })
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    if (darkMode) {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("darkMode", "false")
    } else {
      document.documentElement.classList.add("dark")
      localStorage.setItem("darkMode", "true")
    }
  }

  async function handleLogout() {
    if (isGuest) {
      setShowSignOutConfirmation(true)
    } else {
      performLogout()
    }
  }

  async function performLogout() {
    await logout()
    setUser(null)
    setIsGuest(false)
    router.refresh()
  }

  // Add this function after the performLogout function
  const navigate = (path: string) => {
    router.push(path)
  }

  return (
    <div className={`text-foreground transition-colors ${montserrat.className} bg-transparent pt-6`}>
      <div className="container mx-auto px-4 h-20 relative flex items-end justify-center bg-transparent">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Adobe%20Express%20-%20file-evKhuFghDRNXLRPTGkM6vvTjTE7iy6.png"
          alt="Pokemon TCG Character"
          className="h-20 w-20 object-contain absolute left-4 bottom-0"
        />
        <h1 className="text-2xl font-bold text-shadow text-gray-800 dark:text-gray-100 tracking-wide">
          Dragapultist <i>PTCG Trainer</i>
        </h1>
        <div className="absolute right-4 bottom-0 flex items-center gap-4 h-full">
          {!user && (
            <span
              onClick={() => setDialogOpen(true)}
              className="text-sm text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium tracking-wide cursor-pointer select-text hover:scale-105 transition-transform duration-200"
            >
              Login / Sign Up
            </span>
          )}
          {user && (
            <span
              onClick={handleLogout}
              className="text-sm text-gray-800 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium tracking-wide cursor-pointer select-none hover:scale-105 transition-transform duration-200"
            >
              {isGuest ? "Sign Out (Guest)" : "Sign Out"}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="relative w-10 h-10 overflow-hidden rounded-full transition-transform duration-200 hover:scale-110"
          >
            <img
              src={
                darkMode
                  ? "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Lunatone-JVFsUOI9tH5tahaz5HxvaiZPts4spx.png"
                  : "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Solrock-wpihSvSf0TX3GjYxmrlVBXJw099B41.png"
              }
              alt={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="absolute inset-0 w-8 h-8 m-auto object-contain transition-opacity duration-300 ease-in-out opacity-75"
              style={{ opacity: 0.75 }}
            />
          </Button>
        </div>
      </div>
      {isGuest && showGuestNotification && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md animate-fadeIn">
          <p className="mb-3">You are now signed in as a guest. Please sign up or sign in to save any data.</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowGuestNotification(false)}
              className="px-4 py-2 bg-transparent hover:bg-blue-600 rounded-md transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                setShowGuestNotification(false)
                setDialogOpen(true)
              }}
              className="px-4 py-2 bg-white text-blue-500 hover:bg-gray-100 rounded-md transition-colors"
            >
              Sign in / Sign up
            </button>
          </div>
        </div>
      )}
      {showSignOutConfirmation && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md animate-fadeIn">
          <p className="mb-3">Do you want to save your data before you go?</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowSignOutConfirmation(false)
                performLogout()
              }}
              className="px-4 py-2 bg-transparent hover:bg-blue-600 rounded-md transition-colors"
            >
              Sign Out
            </button>
            <button
              onClick={() => {
                setShowSignOutConfirmation(false)
                setDialogOpen(true)
              }}
              className="px-4 py-2 bg-white text-blue-500 hover:bg-gray-100 rounded-md transition-colors"
            >
              Yes
            </button>
          </div>
        </div>
      )}
      <AuthDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={() => getUser().then(setUser)} />
    </div>
  )
}
