import * as cheerio from "cheerio"
import type { CheckCategory, CheckResult, ScanReport, Severity } from "./types"
import { validateLinks } from "./links"
import * as C from "./checks"

const FETCH_TIMEOUT_MS = 15000

async function fetchPage(url: string) {
  const start = Date.now()
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; QA-Scanner/1.0; +https://qa-scanner.local)",
        Accept: "text/html,application/xhtml+xml",
      },
    })
    const html = await res.text()
    return {
      html,
      status: res.status,
      finalUrl: res.url,
      redirected: res.redirected,
      contentType: res.headers.get("content-type"),
      fetchTimeMs: Date.now() - start,
      pageSizeBytes: html.length,
    }
  } finally {
    clearTimeout(t)
  }
}

export async function runScan(rawUrl: string, opts?: { validateLinks?: boolean }): Promise<ScanReport> {
  const started = Date.now()
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error("Invalid URL. Include the protocol (https://).")
  }

  const fetched = await fetchPage(url.toString())
  const $ = cheerio.load(fetched.html)
  const baseUrl = new URL(fetched.finalUrl || url.toString())

  // Extracts
  const headings = C.extractHeadings($)
  const images = C.extractImages($, baseUrl)
  let links = C.extractLinks($, baseUrl)

  const bodyText = $("body").text().replace(/\s+/g, " ").trim()

  // Validate links (limit to avoid timeouts)
  const linksToValidate = links.slice(0, 60)
  if (opts?.validateLinks !== false) {
    const validated = await validateLinks(linksToValidate)
    // merge validated info
    links = links.map((l, i) => (i < validated.length ? validated[i] : l))
  }

  // Meta tags map
  const metaTags: Record<string, string> = {}
  $("meta").each((_, el) => {
    const name = $(el).attr("name") || $(el).attr("property")
    const content = $(el).attr("content")
    if (name && content) metaTags[name] = content
  })

  const checks: CheckResult[] = [
    C.checkPageTitle($),
    C.checkMetaTitleLength($),
    C.checkMetaDescription($),
    C.checkMetaDescriptionLength($),
    C.checkCanonical($, url.toString()),
    C.checkRobots($),
    C.checkOpenGraph($),
    C.checkTwitterCards($),
    C.checkH1($),
    C.checkH1TitleCase($),
    C.checkHeadingHierarchy(headings),
    C.checkMainSubheading(headings),
    C.checkBodySubheadings(headings),
    C.checkUrlConvention(url.toString()),
    C.checkUrlLength(url.toString()),
    C.checkBrokenLinks(links),
    C.checkRedirects(links),
    C.checkExternalNewTab(links),
    C.checkInternalSameTab(links),
    C.checkPdfsNewTab(links),
    C.checkLinkRelSecurity(links),
    C.checkImageAlt(images),
    C.checkTitleMatchesH1($),
    C.checkTrademarkSuperscript(fetched.html),
    C.checkSpelling(bodyText),
    C.checkContactForm($),
    C.checkInternalSearch($),
    C.checkVideoTranscript($),
    C.checkMultimediaPlayback($),
    C.checkRegionLanguage($),
    C.checkEyebrowText($),
    C.checkCtaText($),
    C.checkWebPageTagging($),
    C.checkCampaignId(url.toString()),
    C.checkPageSpeed(fetched.fetchTimeMs, fetched.pageSizeBytes),
    C.checkMobileSeo($),
    C.checkAuthentication($),
    C.checkCopyLink($),
    C.checkTocFootnotes($),
    C.checkInsightsFilter($),
    C.checkGatedFormDownload($),
    C.checkContentFormatting($),
    C.checkGoogleIndexing($, url.toString()),
    C.checkFigmaAlignment(),
    C.checkCrossBrowser(),
  ]

  // Summary
  const summary = {
    total: checks.length,
    pass: checks.filter((c) => c.status === "pass").length,
    fail: checks.filter((c) => c.status === "fail").length,
    warn: checks.filter((c) => c.status === "warn").length,
    info: checks.filter((c) => c.status === "info").length,
    score: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as Record<Severity, number>,
    byCategory: {} as Record<CheckCategory, { pass: number; fail: number; warn: number }>,
  }

  for (const c of checks) {
    if (c.status === "fail" || c.status === "warn") summary.bySeverity[c.severity]++
    const cat = c.category
    summary.byCategory[cat] = summary.byCategory[cat] || { pass: 0, fail: 0, warn: 0 }
    if (c.status === "pass") summary.byCategory[cat].pass++
    if (c.status === "fail") summary.byCategory[cat].fail++
    if (c.status === "warn") summary.byCategory[cat].warn++
  }

  // Score: weighted by severity
  const weights: Record<Severity, number> = { critical: 10, high: 6, medium: 3, low: 1, info: 0 }
  const penalty = checks.reduce(
    (acc, c) => acc + (c.status === "fail" ? weights[c.severity] : c.status === "warn" ? weights[c.severity] / 2 : 0),
    0,
  )
  const maxPenalty = checks.length * weights.high
  summary.score = Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100))

  return {
    meta: {
      url: url.toString(),
      finalUrl: fetched.finalUrl,
      scannedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      httpStatus: fetched.status,
      redirected: fetched.redirected,
      contentType: fetched.contentType,
      pageSizeBytes: fetched.pageSizeBytes,
      fetchTimeMs: fetched.fetchTimeMs,
      title: $("title").first().text().trim() || null,
      description: $('meta[name="description"]').attr("content")?.trim() || null,
    },
    summary,
    checks,
    links,
    images,
    headings,
    metaTags,
  }
}
