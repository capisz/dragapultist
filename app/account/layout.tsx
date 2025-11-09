import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Statistics - Pokémon TCG Analyzer",
  description: "View your Pokémon TCG game statistics and deck performance",
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F6F2] to-[#F0EDE5] dark:from-[#1A1E24] dark:to-[#15181D]">
      <div className="max-w-7xl mx-auto pt-8">{children}</div>
    </div>
  )
}
