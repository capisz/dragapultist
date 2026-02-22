import type React from "react"
import type { Metadata } from "next"
import { AuthHeader } from "@/components/auth/auth-header"

export const metadata: Metadata = {
  title: "Account Statistics - Pokémon TCG Analyzer",
  description: "View your Pokémon TCG game statistics and deck performance",
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-2 md:py-5">
        <AuthHeader />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-10 md:px-6 md:pt-12">
        {children}
      </div>
    </div>
  )
}
