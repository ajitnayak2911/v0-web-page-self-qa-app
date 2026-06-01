export type Severity = "critical" | "high" | "medium" | "low" | "info"

export type CheckStatus = "pass" | "fail" | "warn" | "info" | "skip"

export type CheckCategory =
  | "SEO"
  | "Metadata"
  | "Content"
  | "Links"
  | "Accessibility"
  | "Performance"
  | "Technical"
  | "Functionality"
  | "Mobile"
  | "Social"

export interface CheckResult {
  id: string
  name: string
  category: CheckCategory
  status: CheckStatus
  severity: Severity
  message: string
  details?: string
  suggestion?: string
  evidence?: string[]
}

export interface LinkInfo {
  href: string
  text: string
  type: "internal" | "external" | "anchor" | "mailto" | "tel" | "pdf" | "other"
  target?: string
  rel?: string
  status?: number
  statusText?: string
  redirected?: boolean
  finalUrl?: string
  ok?: boolean
  error?: string
}

export interface ImageInfo {
  src: string
  alt: string | null
  hasAlt: boolean
  width?: string
  height?: string
  role?: string
}

export interface HeadingInfo {
  level: number
  text: string
}

export interface ScanMeta {
  url: string
  finalUrl: string
  scannedAt: string
  durationMs: number
  httpStatus: number
  redirected: boolean
  contentType: string | null
  pageSizeBytes: number
  fetchTimeMs: number
  title: string | null
  description: string | null
}

export interface ScanReport {
  meta: ScanMeta
  summary: {
    total: number
    pass: number
    fail: number
    warn: number
    info: number
    score: number
    bySeverity: Record<Severity, number>
    byCategory: Record<CheckCategory, { pass: number; fail: number; warn: number }>
  }
  checks: CheckResult[]
  links: LinkInfo[]
  images: ImageInfo[]
  headings: HeadingInfo[]
  metaTags: Record<string, string>
}
