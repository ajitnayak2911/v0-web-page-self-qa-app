import * as cheerio from "cheerio"
import type { CheckCategory, CheckResult, ScanReport, Severity } from "./types"
import { validateLinks } from "./links"
import * as C from "./checks"
import { attemptFormSubmission, submissionResultToChecks } from "./form-submit"

const FETCH_TIMEOUT_MS = 15000

async function fetchPage(url: string, auth?: { username: string; password: string }) {
  const start = Date.now()
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; QA-Scanner/1.0; +https://qa-scanner.local)",
    Accept: "text/html,application/xhtml+xml",
  }
  if (auth) {
    const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString("base64")
    headers["Authorization"] = `Basic ${encoded}`
  }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers,
    })
    const html = await res.text()
    const responseHeaders: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      responseHeaders[k.toLowerCase()] = v
    })
    return {
      html,
      status: res.status,
      finalUrl: res.url,
      redirected: res.redirected,
      contentType: res.headers.get("content-type"),
      fetchTimeMs: Date.now() - start,
      pageSizeBytes: html.length,
      responseHeaders,
    }
  } finally {
    clearTimeout(t)
  }
}

export async function runScan(
  rawUrl: string,
  opts?: { validateLinks?: boolean; username?: string; password?: string; submitForms?: boolean },
): Promise<ScanReport> {
  const started = Date.now()
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error("Invalid URL. Include the protocol (https://).")
  }

  const auth =
    opts?.username && opts?.password
      ? { username: opts.username, password: opts.password }
      : undefined

  const fetched = await fetchPage(url.toString(), auth)
  const $ = cheerio.load(fetched.html)
  const baseUrl = new URL(fetched.finalUrl || url.toString())

  // Strip global site chrome (header, footer, cookie banners) so QA checks only
  // evaluate the page-specific content. These elements are shared across every
  // page on the site and produce noise in checks like Dummy Links, CTA Text,
  // Gated Form, External New Tab, etc.
  const CHROME_SELECTORS = [
    "header",
    "footer",
    '[data-component="Header" i]',
    '[data-component="Footer" i]',
    "#site-header",
    "#footer-section",
    ".site-header",
    ".site-footer",
    ".footer",
    '[role="banner"]',
    '[role="contentinfo"]',
    // Common cookie / consent banners
    "#onetrust-banner-sdk",
    "#onetrust-consent-sdk",
    "#cookie-banner",
    ".cookie-banner",
  ].join(", ")
  $(CHROME_SELECTORS).remove()

  // Extracts
  const headings = C.extractHeadings($)
  const images = C.extractImages($, baseUrl)
  let links = C.extractLinks($, baseUrl)

  const bodyText = $("body").text().replace(/\s+/g, " ").trim()

  // Validate links (limit to avoid timeouts)
  const linksToValidate = links.slice(0, 60)
  if (opts?.validateLinks !== false) {
    const validated = await validateLinks(linksToValidate, 8, auth)
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
    C.checkSubheadStyling($),
    C.checkBadgeAllCaps($),
    C.checkCopyLinkButtons($),
    C.checkUrlConvention(url.toString()),
    C.checkUrlLength(url.toString()),
    C.checkDummyLinks($),
    C.checkLinkBehaviorAudit($, baseUrl, links),
    C.checkBrokenLinks(links),
    C.checkRedirects(links),
    C.checkExternalNewTab(links),
    C.checkInternalSameTab(links),
    C.checkPdfsNewTab(links),
    C.checkGatedPdfPath(links),
    C.checkLinkRelSecurity(links),
    C.checkImageAlt(images),
    C.checkTitleMatchesH1($),
    C.checkTrademarkSuperscript($),
    C.checkSpelling(bodyText),
    C.checkContactForm($),
    C.checkInternalSearch($),
    C.checkVideoTranscript($),
    C.checkMultimediaPlayback($),
    C.checkRegionLanguage($),
    C.checkCtaText($),
    C.checkWebPageTagging($),
    C.checkCampaignId(url.toString()),
    C.checkPageSpeed(fetched.fetchTimeMs, fetched.pageSizeBytes),
    C.checkMobileSeo($),
    C.checkAuthentication($),
    C.checkTocFootnotes($),
    C.checkInsightsFilter($),
    C.checkGatedFormDownload($),
    C.checkContentFormatting($),
    C.checkGoogleIndexing($, url.toString()),
    C.checkFigmaAlignment(),
    C.checkCrossBrowser(),
    // ----- Accessibility additions -----
    C.checkHtmlLangAttr($),
    C.checkSkipToMainLink($),
    C.checkFormLabels($),
    C.checkButtonAccessibleName($),
    C.checkIframeTitle($),
    C.checkDuplicateIds($),
    // ----- Security / Technical additions -----
    C.checkHttpsProtocol(url.toString()),
    C.checkMixedContent($, url.toString()),
    C.checkInlineEventHandlers($),
    C.checkSecurityHeaders(fetched.responseHeaders || {}),
    // ----- SEO additions -----
    C.checkStructuredData($),
    C.checkHreflang($),
    C.checkFavicon($),
    // ----- Content additions -----
    C.checkWordCount($),
    C.checkDuplicateHeadingText(headings),
    // ----- Analytics -----
    C.checkAnalyticsTags($),
    // ----- Performance additions -----
    C.checkImageLazyLoading($),
    C.checkRenderBlockingScripts($),
    // ----- Functionality additions -----
    C.checkBreadcrumbs($),
  ]

  // Opt-in headless-browser form submission (Deep Scan)
  if (opts?.submitForms) {
    try {
      const sub = await attemptFormSubmission({
        url: fetched.finalUrl || url.toString(),
        auth,
        timeoutMs: 30000,
      })
      checks.push(...submissionResultToChecks(sub))
    } catch (err) {
      checks.push({
        id: "contact-form-submit",
        label: "Contact Form Auto-Submit (Deep Scan)",
        category: "Functionality",
        status: "warn",
        severity: "medium",
        message: `Form auto-submit failed to launch: ${(err as Error).message}`,
        recommendation:
          "Headless Chromium could not start (likely a serverless environment limit). Try again or run the manual end-to-end test.",
      })
    }
  }

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
