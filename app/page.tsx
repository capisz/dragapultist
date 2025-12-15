// app/page.tsx
import { PokemonTCGAnalyzer } from "@/components/pokemon-tcg-analyzer"
import { AuthHeader } from "@/components/auth/auth-header"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Keep header constrained, keep analyzer/footer full-width */}
      <div className="max-w-6xl mx-auto px-4 py-2 md:py-6 space-y-1 md:space-y-0">
        <AuthHeader />
      </div>

      <PokemonTCGAnalyzer />
    </div>
  )
}
