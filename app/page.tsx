// app/page.tsx
import { PokemonTCGAnalyzer } from "@/components/pokemon-tcg-analyzer"
import { AuthHeader } from "@/components/auth/auth-header"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Keep header constrained, keep analyzer/footer full-width */}
      <div className="option-a-header"><div className="max-w-[1280px] mx-auto header-inner px-4 py-2">
        <AuthHeader />
      </div></div>

      <PokemonTCGAnalyzer />
    </div>
  )
}
