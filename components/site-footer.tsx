import Link from "next/link"
import Image from "next/image"
import { Linkedin, Instagram, Facebook, Youtube } from "lucide-react"

const columns = [
  {
    title: "Company information",
    links: ["About Broadridge", "Careers", "Client access", "Company newsroom", "Investor relations", "Manage email preferences"],
  },
  {
    title: "",
    links: ["Office locations", "Our culture", "Partner program", "Security capabilities", "Sustainability"],
  },
  {
    title: "Who we serve",
    links: ["Asset Management", "Capital Markets", "Issuers", "Wealth Management", "Consumer Industries"],
  },
]

const legalLinks = [
  "Accessibility Statement",
  "Do Not Sell My Personal Information",
  "Legal Statements",
  "Modern Slavery",
  "Terms of Use & Linking Policy",
  "Privacy Statement",
  "Your Privacy Choices",
]

export function SiteFooter() {
  return (
    <footer className="bg-[oklch(0.16_0.06_260)] text-white/80 mt-16">
      <div className="container max-w-7xl mx-auto px-6 pt-14 pb-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Image
              src="/broadridge-logo-white.png"
              alt="Broadridge"
              width={180}
              height={36}
              className="h-9 w-auto mb-5"
            />
            <p className="text-sm leading-relaxed text-white/70 max-w-md">
              Broadridge is a global technology leader with trusted expertise and transformative technology, helping our
              clients and the financial services industry operate, innovate, and grow.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Linkedin, Instagram, Facebook, Youtube].map((Icon, i) => (
                <Link
                  key={i}
                  href="#"
                  className="h-9 w-9 rounded-full border border-white/25 flex items-center justify-center hover:bg-white/10 transition"
                  aria-label="Social"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col, idx) => (
            <div key={idx}>
              {col.title && (
                <h3 className="text-sm font-semibold text-white mb-4">{col.title}</h3>
              )}
              {!col.title && <div className="hidden lg:block h-9" aria-hidden />}
              <ul className="space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-white/70 hover:text-white transition">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/15">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">
            {legalLinks.map((link) => (
              <li key={link}>
                <Link href="#" className="hover:text-white transition">
                  {link}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-white/50">
            &copy; {new Date().getFullYear()} Broadridge Financial Solutions, Inc. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
