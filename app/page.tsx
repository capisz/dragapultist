import { cookies } from "next/headers"
import { AuthHeader } from "@/components/auth/auth-header"
import { PokemonTCGAnalyzer } from "@/components/pokemon-tcg-analyzer"
import { Footer } from "@/components/footer"
import type { User } from "@/types/auth"

// In a real app, you'd want to fetch this from your database
const mockUsers: Record<string, User> = {}

export default function Home() {
  const userId = cookies().get("userId")?.value
  const user = userId ? mockUsers[userId] : undefined

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F6F2] to-[#F0EDE5] dark:from-[#1A1E24] dark:to-[#15181D]">
      <div className="max-w-7xl mx-auto">
        <div className="relative">
          <AuthHeader />
          <main>
            <PokemonTCGAnalyzer />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
