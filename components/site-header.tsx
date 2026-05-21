import Link from "next/link"
import { Search } from "lucide-react"
import { BroadridgeLogo } from "@/components/broadridge-logo"

const mainNav = ["Who we serve", "Capabilities", "Insights", "About us"]
const utilityNav = ["Client access", "Careers"]

export function SiteHeader() {
  return (
    <header className="bg-white">
      {/* Utility bar */}
      <div className="border-b border-border/60">
        <div className="container max-w-7xl mx-auto px-6 h-9 flex items-center justify-end gap-6 text-xs text-muted-foreground">
          {utilityNav.map((item) => (
            <Link key={item} href="#" className="hover:text-foreground transition">
              {item}
            </Link>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
        </div>
      </div>

      {/* Main nav */}
      <div className="border-b border-border">
        <div className="container max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" aria-label="Broadridge home">
            <BroadridgeLogo size="lg" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {mainNav.map((item) => (
              <Link
                key={item}
                href="#"
                className="text-[15px] font-medium text-foreground/80 hover:text-foreground transition"
              >
                {item}
              </Link>
            ))}
            <Link
              href="#contact"
              className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              Contact us
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
