// app/layout.tsx
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { SiteFooter } from "@/components/site-footer"
import { cn } from "@/lib/utils"
import "./globals.css"

export const metadata: Metadata = {
  title: "Dragapultist Pokémon TCG Analyzer",
  description: "Analyze and build Pokémon TCG decks dynamically",
  icons: { icon: "/icon.png" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          GeistSans.className,
          "min-h-dvh antialiased",
          "bg-sky-100 text-slate-900",
          "dark:bg-[#243952] dark:text-slate-50"
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-dvh flex flex-col">
            {/* If you have a header/nav, render it here */}

            {/* Main grows to fill remaining space */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer is outside any max-width page container */}
            <SiteFooter />
          </div>

          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
