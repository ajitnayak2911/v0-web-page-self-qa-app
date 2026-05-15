"use client"

import type { ScanReport } from "@/lib/scanner/types"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, AlertTriangle, XCircle, Info, Gauge, Clock, FileText, Link as LinkIcon } from "lucide-react"

export function ScanSummary({ report }: { report: ScanReport }) {
  const { summary, meta } = report
  const scoreColor =
    summary.score >= 85
      ? "text-emerald-600"
      : summary.score >= 65
        ? "text-amber-600"
        : "text-red-600"

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">QA Score</p>
              <p className={`text-4xl font-bold mt-1 ${scoreColor}`}>{summary.score}</p>
              <p className="text-xs text-muted-foreground mt-1">out of 100</p>
            </div>
            <Gauge className={`h-10 w-10 ${scoreColor} opacity-60`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Checks</p>
          <p className="text-3xl font-bold mt-1">{summary.total}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> {summary.pass} pass
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" /> {summary.warn} warn
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3 w-3" /> {summary.fail} fail
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Info className="h-3 w-3" /> {summary.info} info
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Severity</p>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-red-700">Critical</span>
              <span className="font-medium">{summary.bySeverity.critical}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">High</span>
              <span className="font-medium">{summary.bySeverity.high}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600">Medium</span>
              <span className="font-medium">{summary.bySeverity.medium}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Low</span>
              <span className="font-medium">{summary.bySeverity.low}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Page</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{meta.fetchTimeMs}ms load</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{Math.round(meta.pageSizeBytes / 1024)} KB</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <LinkIcon className="h-3.5 w-3.5" />
              <span>{report.links.length} links</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>HTTP {meta.httpStatus}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
