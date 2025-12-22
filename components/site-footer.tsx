// components/site-footer.tsx
import Link from "next/link"
import { cn } from "@/lib/utils"

export function SiteFooter() {
  return (
    <footer
      className={cn(
        "w-full border-t border-sky-200 bg-[rgba(245,251,255,0.8)] shadow-inner backdrop-blur-sm",
    "dark:border-slate-800 dark:bg-slate-800/80"
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col gap-6",
          "px-4 py-6 text-xs leading-relaxed text-slate-800",
          "md:flex-row md:items-start md:justify-between md:px-6 md:py-8",
          "dark:text-slate-300",
        )}
      >
        {/* Left: title + nav */}
        <div className="space-y-2 md:w-1/2">
          <div className="tracking-[0.28em] text-[11px] font-semibold uppercase text-slate-700 dark:text-slate-200">
            DRAGAPULTIST
          </div>

        
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            

            <Link
              href="https://prize-checkr-io.vercel.app/"
              className="hover:underline"
            >
              PrizeCheckDrillr.io
            </Link>

             <Link
              href="https://tcgmasters.net"
              className="hover:underline"
            >
              TCGMasters
            </Link>

            <Link
              href="https://limitlesstcg.com"
              className="hover:underline"
            >
              LimitlessTCG 
            </Link>
            <Link
              href="https://limitlesstcg.com/tools/tabletop"
              className="hover:underline"
            >
              Limitless TableTop 
            </Link>
          </div>
        </div>

        {/* Right: disclaimer */}
        <div className="md:w-1/2 md:text-right">
          <p className="text-[12px] text-slate-600 dark:text-slate-400">
            This website presents fan-made tools for the Pokémon Trading Card Game.
            Pokémon and all related names, images, and trademarks are property of
            Nintendo, Creatures, and Game Freak. Dragapultist is not produced by,
            endorsed by, or affiliated with these companies.
          </p>
        </div>
      </div>
    </footer>
  )
}
