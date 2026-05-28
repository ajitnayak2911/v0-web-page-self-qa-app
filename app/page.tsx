"use client"

import { useState } from "react"
import { ScanForm } from "@/components/scan-form"
import { ScanSummary } from "@/components/scan-summary"
import { ScanReportView } from "@/components/scan-report"
import type { ScanReport } from "@/lib/scanner/types"
import { AlertCircle } from "lucide-react"
import { BroadridgeLogo } from "@/components/broadridge-logo"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ScanReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleScan(
    url: string,
    validateLinks: boolean,
    username?: string,
    password?: string,
    submitForms?: boolean,
  ) {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, validateLinks, username, password, submitForms }),
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
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 h-20 flex items-center">
          <BroadridgeLogo size="lg" />
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[oklch(0.16_0.06_260)] text-white">
        <div className="container max-w-6xl mx-auto px-4 py-16">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance max-w-3xl">
            Self-service web page quality assurance
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl text-pretty">
            Run a deep QA scan on any Broadridge page. Validate UI, links, accessibility, SEO, and content quality in
            seconds.
          </p>
        </div>
      </section>

      {/* Scan form + results */}
      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <ScanForm onScan={handleScan} loading={loading} />

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Scan failed</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">
                Fetching page, parsing HTML, and validating links — this may take 10–30 seconds...
              </p>
            </div>
          </div>
        )}

        {report && (
          <>
            <ScanSummary report={report} />
            <ScanReportView report={report} />
          </>
        )}

        {!report && !loading && !error && (
          <section aria-labelledby="features-heading" className="pt-4">
            <h2 id="features-heading" className="sr-only">
              What QA Scanner does
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <article className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                <div className="h-1 w-10 rounded-full bg-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground">40+ QA Checks</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  SEO, metadata, accessibility, content quality, links, performance, and technical validation.
                </p>
              </article>
              <article className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                <div className="h-1 w-10 rounded-full bg-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Deep Link Analysis</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Validates every link, detects broken URLs, redirects, missing target attributes, and security issues.
                </p>
              </article>
              <article className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                <div className="h-1 w-10 rounded-full bg-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Actionable Report</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Severity-tagged findings with evidence and suggested fixes. Export a formatted Excel report with a
                  pass/fail chart, ready to attach to email.
                </p>
              </article>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[oklch(0.16_0.06_260)] text-white/70 mt-12">
        <div className="container max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <BroadridgeLogo variant="light" size="md" />
          <p className="text-xs">
            &copy; {new Date().getFullYear()} Broadridge Financial Solutions, Inc. — QA Scanner for internal teams.
          </p>
        </div>
      </footer>
    </main>
  )
}
