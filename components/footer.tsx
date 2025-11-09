"use client"
import { Button } from "@/components/ui/button"
import { Montserrat } from "next/font/google"
const montserrat = Montserrat({ subsets: ["latin"] })

export function Footer() {
  const currentYear = new Date().getFullYear()
  return (
    <footer className={`text-gray-800 dark:text-gray-200 py-6 ${montserrat.className}`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-center gap-4 mb-4">
          <Button variant="ghost" onClick={() => (window.location.href = "/terms")}>Terms of Use</Button>
          <Button variant="ghost" onClick={() => (window.location.href = "/contact")}>Contact</Button>
          <Button variant="ghost" onClick={() => (window.location.href = "/privacy")}>Privacy</Button>
        </div>
        <div className="text-center text-sm mt-4">Dragapultist &copy; {currentYear}</div>
      </div>
    </footer>
  )
}
