"use client"

import { useState, useMemo } from "react"
import type { CheckResult, ScanReport } from "@/lib/scanner/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ExternalLink,
  Download,
  ChevronRight,
} from "lucide-react"

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", label: "Pass" },
  warn: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", label: "Warn" },
  fail: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", label: "Fail" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/40", label: "Info" },
  skip: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/40", label: "Skip" },
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200",
  high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300",
  medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300",
  low: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300",
  info: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400",
}

function CheckRow({ check }: { check: CheckResult }) {
  const cfg = STATUS_CONFIG[check.status]
  const Icon = cfg.icon
  return (
    <AccordionItem value={check.id} className="border border-border rounded-lg px-4 mb-2 bg-card">
      <AccordionTrigger className="hover:no-underline py-3">
        <div className="flex items-start gap-3 text-left w-full">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{check.name}</span>
              <Badge variant="outline" className="text-[10px] h-5">{check.category}</Badge>
              {check.status !== "pass" && check.status !== "info" && (
                <Badge variant="outline" className={`text-[10px] h-5 border ${SEVERITY_BADGE[check.severity]}`}>
                  {check.severity}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{check.message}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-8 space-y-3 pb-2">
          {check.details && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Details</p>
              <p className="text-sm break-words">{check.details}</p>
            </div>
          )}
          {check.suggestion && (
            <div className={`${cfg.bg} p-3 rounded-md border border-border`}>
              <p className="text-xs font-medium mb-1">Suggested Fix</p>
              <p className="text-sm">{check.suggestion}</p>
            </div>
          )}
          {check.evidence && check.evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Evidence ({check.evidence.length})</p>
              <ul className="space-y-1">
                {check.evidence.map((e, i) => (
                  <li key={i} className="text-xs font-mono bg-muted/50 px-2 py-1 rounded break-all">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function ScanReportView({ report }: { report: ScanReport }) {
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass" | "info">("all")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string>("all")

  const categories = useMemo(() => {
    const set = new Set(report.checks.map((c) => c.category))
    return ["all", ...Array.from(set)]
  }, [report.checks])

  const filtered = report.checks.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false
    if (category !== "all" && c.category !== category) return false
    if (search && !`${c.name} ${c.message}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function exportJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `qa-scan-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Tabs defaultValue="checks" className="w-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <TabsList>
          <TabsTrigger value="checks">Checks ({report.checks.length})</TabsTrigger>
          <TabsTrigger value="links">Links ({report.links.length})</TabsTrigger>
          <TabsTrigger value="images">Images ({report.images.length})</TabsTrigger>
          <TabsTrigger value="headings">Headings ({report.headings.length})</TabsTrigger>
          <TabsTrigger value="meta">Metadata</TabsTrigger>
        </TabsList>
        <Button variant="outline" size="sm" onClick={exportJson}>
          <Download className="h-4 w-4 mr-2" />
          Export JSON
        </Button>
      </div>

      <TabsContent value="checks">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">QA Checks</CardTitle>
            <div className="flex flex-col md:flex-row gap-2 mt-2">
              <Input
                placeholder="Search checks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="md:max-w-xs h-9"
              />
              <div className="flex gap-1 flex-wrap">
                {(["all", "fail", "warn", "pass", "info"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                    className="h-9 capitalize"
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                {categories.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={category === c ? "secondary" : "ghost"}
                    onClick={() => setCategory(c)}
                    className="h-9"
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No checks match filters.</p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {filtered.map((c) => (
                  <CheckRow key={c.id} check={c} />
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="links">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Target</th>
                    <th className="py-2 pr-3">Text</th>
                    <th className="py-2">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {report.links.map((l, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 pr-3">
                        {l.ok === false ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                            {l.status || "ERR"}
                          </Badge>
                        ) : l.redirected ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            {l.status} ↻
                          </Badge>
                        ) : l.status ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            {l.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">—</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-[10px] capitalize">{l.type}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{l.target || "—"}</td>
                      <td className="py-2 pr-3 max-w-[200px] truncate">{l.text || "—"}</td>
                      <td className="py-2 max-w-[400px] truncate">
                        <a href={l.href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                          <span className="truncate">{l.href}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="images">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-3">Alt</th>
                    <th className="py-2 pr-3">Alt Text</th>
                    <th className="py-2 pr-3">Dimensions</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {report.images.map((img, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 pr-3">
                        {img.hasAlt ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </td>
                      <td className="py-2 pr-3 max-w-[250px] truncate">{img.alt || <span className="text-muted-foreground italic">missing</span>}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {img.width || "?"} × {img.height || "?"}
                      </td>
                      <td className="py-2 max-w-[400px] truncate">
                        <a href={img.src} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          {img.src}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="headings">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Heading Outline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {report.headings.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 py-1 text-sm"
                  style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                >
                  <Badge variant="outline" className="text-[10px] shrink-0">H{h.level}</Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{h.text}</span>
                </div>
              ))}
              {report.headings.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">No headings found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="meta">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meta Tags & Page Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Final URL</p>
                <p className="font-mono break-all">{report.meta.finalUrl}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Title</p>
                <p>{report.meta.title || <span className="italic text-muted-foreground">none</span>}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p>{report.meta.description || <span className="italic text-muted-foreground">none</span>}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">All Meta Tags</p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {Object.entries(report.metaTags).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[180px_1fr] gap-2 text-xs py-1 border-b border-border/30">
                      <span className="font-mono text-muted-foreground truncate">{k}</span>
                      <span className="break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
