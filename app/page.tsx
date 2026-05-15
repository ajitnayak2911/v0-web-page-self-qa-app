"use client"

import { useState } from "react"
import { ScanForm } from "@/components/scan-form"
import { ScanSummary } from "@/components/scan-summary"
import { ScanReportView } from "@/components/scan-report"
import type { ScanReport } from "@/lib/scanner/types"
import { ShieldCheck, AlertCircle } from "lucide-react"

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<ScanReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleScan(url: string, validateLinks: boolean) {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, validateLinks }),
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
      <header className="border-b border-border bg-card">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">QA Scanner</h1>
              <p className="text-xs text-muted-foreground">Self-service web page quality assurance</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            Run a deep QA scan on any webpage
          </h2>
          <p className="text-muted-foreground mt-1 text-pretty">
            Checks UI, links, accessibility, SEO, metadata, content quality, and more across 40+ validations.
          </p>
        </div>

        <ScanForm onScan={handleScan} loading={loading} />

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900 dark:text-red-200">Scan failed</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
          <div className="space-y-6">
            <ScanSummary report={report} />
            <ScanReportView report={report} />
          </div>
        )}

        {!report && !loading && !error && (
          <div className="grid gap-4 md:grid-cols-3 mt-8">
            <FeatureCard
              title="40+ QA Checks"
              description="SEO, metadata, accessibility, content quality, links, performance, and technical validation."
            />
            <FeatureCard
              title="Deep Link Analysis"
              description="Validates every link, detects broken URLs, redirects, missing target attributes, and security issues."
            />
            <FeatureCard
              title="Actionable Report"
              description="Severity-tagged findings with evidence and suggested fixes. Export as JSON for tickets."
            />
          </div>
        )}
      </div>

      <footer className="border-t border-border mt-12">
        <div className="container max-w-6xl mx-auto px-4 py-6 text-xs text-muted-foreground">
          QA Scanner — built for internal teams to self-QA web pages before formal review.
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-5 rounded-lg border border-border bg-card">
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-pretty">{description}</p>
    </div>
  )
}
