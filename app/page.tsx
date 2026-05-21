"use client"

import { useState } from "react"
import { ScanForm } from "@/components/scan-form"
import { ScanSummary } from "@/components/scan-summary"
import { ScanReportView } from "@/components/scan-report"
import type { ScanReport } from "@/lib/scanner/types"
import { AlertCircle, ArrowRight, ShieldCheck, Link2, FileText } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ScanReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleScan(url: string, validateLinks: boolean, username?: string, password?: string) {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, validateLinks, username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Scan failed")
      setReport(data.report)
    } catch (e: any) {
      setError(e?.message || "Scan failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[oklch(0.16_0.06_260)] text-white">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, oklch(0.40 0.18 260) 0%, transparent 45%), radial-gradient(circle at 80% 70%, oklch(0.30 0.14 260) 0%, transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative container max-w-7xl mx-auto px-6 py-20 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/60 mb-5">
            Internal QA Toolkit
          </p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-balance max-w-4xl leading-[1.05]">
            Self-service web page quality assurance
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/75 max-w-2xl text-pretty leading-relaxed">
            Run a deep QA scan on any Broadridge page. Validate UI, links, accessibility, SEO, and content quality in
            seconds.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-white/70">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Scanner ready
          </div>
        </div>
      </section>

      {/* Scan form section */}
      <section className="bg-white">
        <div className="container max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              Scan a webpage
            </h2>
            <p className="text-muted-foreground mt-2 text-pretty">
              Paste a URL below to run 40+ validations including links, accessibility, SEO, metadata, and content
              quality.
            </p>
          </div>
          <div className="mt-8">
            <ScanForm onScan={handleScan} loading={loading} />
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Scan failed</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Fetching page, parsing HTML, and validating links — this may take 10–30 seconds...
                </p>
              </div>
            </div>
          )}

          {report && (
            <div className="mt-8 space-y-6">
              <ScanSummary report={report} />
              <ScanReportView report={report} />
            </div>
          )}
        </div>
      </section>

      {/* Featured capabilities */}
      {!report && !loading && (
        <section className="bg-[oklch(0.98_0.01_260)] border-t border-border">
          <div className="container max-w-7xl mx-auto px-6 py-16">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-10">
              Featured capabilities
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<ShieldCheck className="h-7 w-7" />}
                title="40+ QA Checks"
                description="SEO, metadata, accessibility, content quality, links, performance, and technical validation."
              />
              <FeatureCard
                icon={<Link2 className="h-7 w-7" />}
                title="Deep Link Analysis"
                description="Validates every link, detects broken URLs, redirects, missing target attributes, and security issues."
              />
              <FeatureCard
                icon={<FileText className="h-7 w-7" />}
                title="Actionable Report"
                description="Severity-tagged findings with evidence and suggested fixes. Export as JSON for tickets."
              />
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <article className="group rounded-xl bg-white border border-border p-7 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="h-14 w-14 rounded-lg bg-accent text-primary flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{description}</p>
      <div className="mt-5 inline-flex items-center text-primary text-sm font-medium">
        Learn more
        <ArrowRight className="ml-1.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </article>
  )
}
