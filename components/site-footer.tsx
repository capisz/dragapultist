// components/site-footer.tsx
import Link from "next/link"
import "./site-footer.css"
import { Montserrat } from "next/font/google"
const montserrat = Montserrat({ subsets: ["latin"] })

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {/* Left: title + nav */}
        <div className="space-y-2 md:w-1/2">
          <div className={`footer-wordmark ${montserrat.className}`}>
            DRAGAPULTIST
          </div>

        
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            

            <Link
              href="https://prizecheck.us/"
              className="hover:underline"
            >
              prizecheck.us
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
          <p className="footer-disclaimer">
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
