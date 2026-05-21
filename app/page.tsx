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
