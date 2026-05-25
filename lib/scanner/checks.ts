import type * as cheerio from "cheerio"
import type { CheckResult, HeadingInfo, ImageInfo, LinkInfo, Severity } from "./types"

type $Type = cheerio.CheerioAPI

function pass(
  id: string,
  name: string,
  category: CheckResult["category"],
  message: string,
  details?: string,
): CheckResult {
  return { id, name, category, status: "pass", severity: "info", message, details }
}
function fail(
  id: string,
  name: string,
  category: CheckResult["category"],
  severity: Severity,
  message: string,
  suggestion?: string,
  details?: string,
  evidence?: string[],
): CheckResult {
  return { id, name, category, status: "fail", severity, message, suggestion, details, evidence }
}
function warn(
  id: string,
  name: string,
  category: CheckResult["category"],
  severity: Severity,
  message: string,
  suggestion?: string,
  details?: string,
  evidence?: string[],
): CheckResult {
  return { id, name, category, status: "warn", severity, message, suggestion, details, evidence }
}
function info(id: string, name: string, category: CheckResult["category"], message: string, details?: string): CheckResult {
  return { id, name, category, status: "info", severity: "info", message, details }
}

// ---------- META & SEO ----------

export function checkPageTitle($: $Type): CheckResult {
  const title = $("title").first().text().trim()
  if (!title)
    return fail("page-title", "Page Title", "SEO", "high", "Missing <title> tag", "Add a descriptive <title>.")
  if (title.length < 10)
    return warn(
      "page-title",
      "Page Title",
      "SEO",
      "medium",
      `Page title is short (${title.length} chars)`,
      "Aim for 50–60 characters.",
      title,
    )
  if (title.length > 70)
    return warn(
      "page-title",
      "Page Title",
      "SEO",
      "medium",
      `Page title is long (${title.length} chars)`,
      "Aim for 50–60 characters.",
      title,
    )
  return pass("page-title", "Page Title", "SEO", `Title present (${title.length} chars)`, title)
}

export function checkMetaTitleLength($: $Type): CheckResult {
  const title = $("title").first().text().trim()
  const len = title.length
  if (!title) return fail("meta-title-length", "Meta Title Length", "Metadata", "high", "Missing title")
  if (len >= 30 && len <= 60)
    return pass("meta-title-length", "Meta Title Length", "Metadata", `${len} characters (optimal)`)
  return warn(
    "meta-title-length",
    "Meta Title Length",
    "Metadata",
    "low",
    `Title length ${len} chars (recommended 30–60)`,
  )
}

export function checkMetaDescription($: $Type): CheckResult {
  const desc = $('meta[name="description"]').attr("content")?.trim() || ""
  if (!desc)
    return fail("meta-desc", "Meta Description", "Metadata", "high", "Missing meta description", "Add a meta description tag.")
  return pass("meta-desc", "Meta Description", "Metadata", `Description present (${desc.length} chars)`, desc)
}

export function checkMetaDescriptionLength($: $Type): CheckResult {
  const desc = $('meta[name="description"]').attr("content")?.trim() || ""
  if (!desc) return fail("meta-desc-length", "Meta Description Length", "Metadata", "high", "Missing meta description")
  const len = desc.length
  if (len >= 120 && len <= 160)
    return pass("meta-desc-length", "Meta Description Length", "Metadata", `${len} characters (optimal)`)
  return warn(
    "meta-desc-length",
    "Meta Description Length",
    "Metadata",
    "low",
    `Description length ${len} chars (recommended 120–160)`,
  )
}

export function checkCanonical($: $Type, pageUrl: string): CheckResult {
  const can = $('link[rel="canonical"]').attr("href")?.trim()
  if (!can)
    return fail("canonical", "Canonical Tag", "SEO", "medium", "Missing canonical link", "Add <link rel=\"canonical\">.")
  return pass("canonical", "Canonical Tag", "SEO", "Canonical present", can)
}

export function checkRobots($: $Type): CheckResult {
  const robots = $('meta[name="robots"]').attr("content")?.trim() || ""
  if (!robots) return info("robots", "Robots Tag", "SEO", "No meta robots tag (defaults to index,follow).")
  if (/noindex/i.test(robots))
    return warn("robots", "Robots Tag", "SEO", "high", "Page is set to noindex", "Remove noindex if page should be indexed.", robots)
  return pass("robots", "Robots Tag", "SEO", "Robots tag present", robots)
}

export function checkOpenGraph($: $Type): CheckResult {
  const required = ["og:title", "og:description", "og:image", "og:url", "og:type"]
  const missing = required.filter((k) => !$(`meta[property="${k}"]`).attr("content"))
  if (missing.length === 0) return pass("og", "Open Graph Tags", "Social", "All key OG tags present")
  return warn(
    "og",
    "Open Graph Tags",
    "Social",
    "medium",
    `Missing OG tags: ${missing.join(", ")}`,
    "Add the missing Open Graph meta tags for better social sharing.",
  )
}

export function checkTwitterCards($: $Type): CheckResult {
  const card = $('meta[name="twitter:card"]').attr("content")
  const required = ["twitter:title", "twitter:description"]
  const missing = required.filter((k) => !$(`meta[name="${k}"]`).attr("content"))
  if (!card) return warn("twitter", "Twitter Cards", "Social", "low", "Missing twitter:card meta tag")
  if (missing.length) return warn("twitter", "Twitter Cards", "Social", "low", `Missing: ${missing.join(", ")}`)
  return pass("twitter", "Twitter Cards", "Social", `Twitter card present (${card})`)
}

// ---------- HEADINGS ----------

export function extractHeadings($: $Type): HeadingInfo[] {
  const headings: HeadingInfo[] = []
  for (let lvl = 1; lvl <= 6; lvl++) {
    $(`h${lvl}`).each((_, el) => {
      const text = $(el).text().trim()
      if (text) headings.push({ level: lvl, text })
    })
  }
  return headings
}

export function checkH1($: $Type): CheckResult {
  const h1s = $("h1")
  const count = h1s.length
  if (count === 0) return fail("h1", "H1 Tag", "SEO", "high", "No H1 tag found", "Each page should have exactly one H1.")
  if (count > 1)
    return warn("h1", "H1 Tag", "SEO", "medium", `Found ${count} H1 tags`, "Use a single H1 per page.")
  return pass("h1", "H1 Tag", "SEO", "Exactly one H1", h1s.first().text().trim())
}

export function checkH1TitleCase($: $Type): CheckResult {
  const h1 = $("h1").first().text().trim()
  if (!h1) return info("h1-case", "H1 Title Case", "Content", "No H1 found to evaluate.")
  const words = h1.split(/\s+/)
  const minor = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "for", "to", "with", "at", "by"])
  const bad = words.filter((w, i) => {
    const clean = w.replace(/[^A-Za-z]/g, "")
    if (!clean) return false
    if (i !== 0 && minor.has(clean.toLowerCase())) return false
    return clean[0] !== clean[0].toUpperCase()
  })
  if (bad.length === 0) return pass("h1-case", "H1 Title Case", "Content", "H1 follows title case", h1)
  return warn(
    "h1-case",
    "H1 Title Case",
    "Content",
    "low",
    `H1 may not follow title case: ${bad.join(", ")}`,
    "Capitalize major words in the H1.",
    h1,
  )
}

export function checkHeadingHierarchy(headings: HeadingInfo[]): CheckResult {
  if (headings.length === 0)
    return fail("heading-hierarchy", "Heading Hierarchy", "Accessibility", "medium", "No headings found")
  let prev = 0
  const skips: string[] = []
  for (const h of headings) {
    if (prev && h.level > prev + 1) skips.push(`H${prev} → H${h.level}: "${h.text.slice(0, 40)}"`)
    prev = h.level
  }
  if (skips.length)
    return warn(
      "heading-hierarchy",
      "Heading Hierarchy",
      "Accessibility",
      "medium",
      `Heading levels skipped (${skips.length})`,
      "Avoid skipping heading levels (e.g., H2 → H4).",
      undefined,
      skips,
    )
  return pass("heading-hierarchy", "Heading Hierarchy", "Accessibility", "Heading hierarchy is sequential")
}

export function checkMainSubheading(headings: HeadingInfo[]): CheckResult {
  const h2 = headings.find((h) => h.level === 2)
  if (!h2) return warn("main-subheading", "Main Subheading", "Content", "low", "No H2 subheading found")
  const text = h2.text
  const issues: string[] = []
  // sentence case = first letter uppercase, mostly lowercase otherwise (allow proper nouns)
  const words = text.split(/\s+/).filter(Boolean)
  const upperWords = words.filter((w, i) => i > 0 && /^[A-Z][a-z]+/.test(w)).length
  // Mostly all-caps title-case detection
  const titleCased = words.filter((w, i) => i > 0 && /^[A-Z]/.test(w) && !/^(I|US|UK|EU|UI|UX|AI|API|SEO|PDF|FAQ)$/.test(w)).length
  if (titleCased > Math.floor(words.length / 2)) issues.push("not in sentence case (looks like title case)")
  if (!/[.!?]$/.test(text.trim())) issues.push("does not end with a period")
  if (text.length > 90) issues.push(`exceeds 90 characters (${text.length})`)
  if (issues.length === 0)
    return pass("main-subheading", "Main Subheading", "Content", "H2 follows guidelines", text)
  return warn(
    "main-subheading",
    "Main Subheading",
    "Content",
    "low",
    `H2 issues: ${issues.join("; ")}`,
    "Main subhead should be sentence case, end with a period, and be ≤ 90 chars (PR exceptions allowed).",
    text,
  )
}

export function checkBodySubheadings(headings: HeadingInfo[]): CheckResult {
  const subs = headings.filter((h) => h.level >= 3).length
  if (subs > 0) return pass("body-subheadings", "Body Subheadings", "Content", `${subs} sub-headings (H3–H6) found`)
  return info("body-subheadings", "Body Subheadings", "Content", "No H3+ subheadings on page.")
}

// ---------- LINK BEHAVIOR AUDIT (mirrors standalone Python "Link Behavior Audit") ----------
const LBA_SPECIAL_EXTERNAL_PATHS = ["/fr/", "/de/", "/jp/", "/next"]
const LBA_IGNORE_SELECTORS = [
  "footer#footer-section",
  "nav#main-nav",
  "div.promo-bar",
  "div.contact-us__bottom",
  "div.ot-sdk-row",
  "div#onetrust-consent-sdk",
  "div#onetrust-group-container",
  "div.ot-pc-footer-logo",
  "a.ot-cookie-policy-link",
  "div.recaptcha-disclaimer",
  "div.recaptcha-disclaimer.reducefont",
  "a.skip-link[href='#main-content']",
]
const LBA_IGNORE_HREF_PATTERNS = [
  "https://policies.google.com/privacy",
  "https://policies.google.com/terms",
  "javascript:void(0)",
  "/contact-us",
]
const LBA_SOCIAL_DOMAINS = ["twitter.com", "facebook.com", "linkedin.com"]
const LBA_DOC_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx"]

export function checkLinkBehaviorAudit(
  $: $Type,
  baseUrl: URL,
  validatedLinks: LinkInfo[],
): CheckResult {
  // Build status map from already-validated links so we don't issue extra requests
  const statusByHref = new Map<string, LinkInfo>()
  for (const l of validatedLinks) if (!statusByHref.has(l.href)) statusByHref.set(l.href, l)

  // Combined selector used to filter out links inside ignored regions
  const ignoreCombined = LBA_IGNORE_SELECTORS.join(", ")

  type Row = {
    text: string
    opensIn: "New Tab" | "Same Tab"
    kind: "Internal" | "External"
    status: number | "Error" | "Unchecked"
    health: string
    expected: "OK" | "FAIL"
    reason: string
    href: string
  }

  const rows: Row[] = []

  $("a[href]").each((_, el) => {
    const $el = $(el)

    // Skip if inside any ignored container (or the element itself matches an ignore selector)
    try {
      if ($el.closest(ignoreCombined).length > 0) return
    } catch {
      // If a selector is unsupported by cheerio, fall through
    }

    let href = ($el.attr("href") || "").trim()
    if (!href) return
    if (href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("#main-content")) return
    if (LBA_IGNORE_HREF_PATTERNS.some((p) => href.includes(p))) return

    let absolute: URL
    try {
      absolute = new URL(href, baseUrl)
    } catch {
      return
    }
    const absHref = absolute.toString()

    const linkText =
      $el.text().trim() ||
      $el.attr("aria-label")?.trim() ||
      $el.attr("title")?.trim() ||
      absHref

    let isExternal = !!absolute.hostname && absolute.hostname !== baseUrl.hostname
    for (const sp of LBA_SPECIAL_EXTERNAL_PATHS) {
      if (absolute.pathname.startsWith(sp) && absolute.hostname === baseUrl.hostname) {
        isExternal = true
        break
      }
    }

    let opensIn: "New Tab" | "Same Tab" = $el.attr("target") === "_blank" ? "New Tab" : "Same Tab"
    if (LBA_SOCIAL_DOMAINS.some((d) => href.includes(d))) opensIn = "New Tab"

    const isDocument = LBA_DOC_EXTENSIONS.some((ext) => absHref.toLowerCase().endsWith(ext))

    let expected: "OK" | "FAIL"
    let reason: string

    if (isDocument) {
      isExternal = true
      if (opensIn === "New Tab") {
        expected = "OK"
        reason = "Document: must open External in New Tab"
      } else {
        expected = "FAIL"
        reason = "Document opened wrong (should be New Tab)"
      }
    } else if (isExternal) {
      if (opensIn === "New Tab") {
        expected = "OK"
        reason = "External OK"
      } else {
        expected = "FAIL"
        reason = "External should open New Tab"
      }
    } else {
      if (opensIn === "Same Tab") {
        expected = "OK"
        reason = "Internal OK"
      } else {
        expected = "FAIL"
        reason = "Internal should open Same Tab"
      }
    }

    // Reuse validated status if available
    const validated = statusByHref.get(absHref)
    let status: number | "Error" | "Unchecked" = "Unchecked"
    let health = "Not checked"
    if (validated) {
      if (typeof validated.status === "number" && validated.status > 0) {
        status = validated.status
        if (status >= 200 && status < 300) health = "OK"
        else if (status >= 300 && status < 400) health = "Redirect"
        else if (status >= 400 && status < 500) health = "Client Error"
        else if (status >= 500 && status < 600) health = "Server Error"
        else health = "Unknown"
      } else if (validated.error || validated.ok === false) {
        status = "Error"
        health = "Unreachable"
      }
    }

    rows.push({
      text: linkText.slice(0, 120),
      opensIn,
      kind: isExternal ? "External" : "Internal",
      status,
      health,
      expected,
      reason,
      href: absHref,
    })
  })

  if (rows.length === 0)
    return info(
      "link-behavior-audit",
      "Link Behavior Audit",
      "Links",
      "No auditable links found after applying ignore rules.",
    )

  const failures = rows.filter((r) => r.expected === "FAIL")
  const unhealthy = rows.filter(
    (r) => r.health === "Client Error" || r.health === "Server Error" || r.health === "Unreachable",
  )

  const evidence = rows
    .slice(0, 80)
    .map(
      (r) =>
        `[${r.expected === "OK" ? "PASS" : "FAIL"}] ${r.kind} | ${r.opensIn} | ${r.status} ${r.health} | "${r.text}" -> ${r.href} -- ${r.reason}`,
    )

  if (failures.length === 0 && unhealthy.length === 0)
    return {
      ...pass(
        "link-behavior-audit",
        "Link Behavior Audit",
        "Links",
        `${rows.length} link(s) audited - all targets correct and healthy`,
      ),
      evidence,
    }

  const sev: Severity = failures.length > 0 ? "medium" : "low"
  const msgs: string[] = []
  if (failures.length) msgs.push(`${failures.length} target-attribute mismatch(es)`)
  if (unhealthy.length) msgs.push(`${unhealthy.length} unhealthy link(s)`)

  return warn(
    "link-behavior-audit",
    "Link Behavior Audit",
    "Links",
    sev,
    `${msgs.join("; ")} across ${rows.length} audited link(s)`,
    "Internal links should open in same tab; external + document links in new tab. Fix 4xx/5xx/unreachable links.",
    undefined,
    evidence,
  )
}

// ---------- COPY LINK / SHARE BUTTON VALIDATION ----------
// Detects share/copy-link buttons (Alpine.js webShare pattern or similar) and validates configuration

export function checkCopyLinkButtons($: $Type): CheckResult {
  const copyButtons: {
    location: string
    type: "webShare" | "social" | "generic"
    hasShareBind: boolean
    hasSvg: boolean
    platform?: string
  }[] = []

  // Pattern 1: Alpine.js webShare button (the copy-link button)
  $("button").each((_, el) => {
    const $el = $(el)
    const xData = $el.attr("x-data")
    const xBind = $el.attr("x-bind")
    
    if (xData === "webShare") {
      const hasShareBind = xBind === "ShareLinkButton"
      const hasSvg = $el.find("svg").length > 0
      copyButtons.push({
        location: `<button x-data="webShare" x-bind="${xBind || "(none)"}">`,
        type: "webShare",
        hasShareBind,
        hasSvg,
      })
    }
  })

  // Pattern 2: Social share buttons (twitter, linkedin, facebook)
  $("button").each((_, el) => {
    const $el = $(el)
    const xData = $el.attr("x-data")
    const xBind = $el.attr("x-bind")
    
    if (xData && /^(twitter|linkedin|facebook)$/i.test(xData)) {
      const expectedBind = `${xData.charAt(0).toUpperCase() + xData.slice(1).toLowerCase()}ShareButton`
      const hasCorrectBind = xBind?.includes("ShareButton") || false
      const hasSvg = $el.find("svg").length > 0
      copyButtons.push({
        location: `<button x-data="${xData}" x-bind="${xBind || "(none)"}">`,
        type: "social",
        hasShareBind: hasCorrectBind,
        hasSvg,
        platform: xData,
      })
    }
  })

  // Pattern 3: Generic share buttons by class/aria
  $('button[class*="share" i], button[aria-label*="share" i], button[aria-label*="copy" i]').each((_, el) => {
    const $el = $(el)
    const xData = $el.attr("x-data")
    // Skip if already matched by Pattern 1 or 2
    if (xData === "webShare" || /^(twitter|linkedin|facebook)$/i.test(xData || "")) return
    const hasSvg = $el.find("svg").length > 0
    const id = $el.attr("aria-label") || $el.attr("class")?.slice(0, 40) || "button"
    copyButtons.push({
      location: `<button ${id}>`,
      type: "generic",
      hasShareBind: true, // assume OK for generic
      hasSvg,
    })
  })

  if (copyButtons.length === 0)
    return info(
      "copy-link-buttons",
      "Copy Link / Share Buttons",
      "Functionality",
      "No copy-link or share buttons detected on the page.",
    )

  // Validate webShare buttons must have x-bind="ShareLinkButton" and contain an SVG icon
  const webShareButtons = copyButtons.filter((b) => b.type === "webShare")
  const socialButtons = copyButtons.filter((b) => b.type === "social")
  
  const misconfiguredWebShare = webShareButtons.filter((b) => !b.hasShareBind || !b.hasSvg)
  const misconfiguredSocial = socialButtons.filter((b) => !b.hasShareBind || !b.hasSvg)

  const evidence = copyButtons.map((b) => {
    const status = b.type === "webShare" 
      ? (b.hasShareBind && b.hasSvg ? "OK" : "ISSUE") 
      : b.type === "social"
        ? (b.hasShareBind && b.hasSvg ? "OK" : "ISSUE")
        : "OK"
    return `[${status}] ${b.type}${b.platform ? ` (${b.platform})` : ""} | ${b.location} | bind=${b.hasShareBind} | svg=${b.hasSvg}`
  })

  const totalMisconfigured = misconfiguredWebShare.length + misconfiguredSocial.length

  if (totalMisconfigured === 0)
    return pass(
      "copy-link-buttons",
      "Copy Link / Share Buttons",
      "Functionality",
      `${copyButtons.length} share button(s) found: ${webShareButtons.length} copy-link, ${socialButtons.length} social — all properly configured`,
      evidence.join("\n"),
    )

  return warn(
    "copy-link-buttons",
    "Copy Link / Share Buttons",
    "Functionality",
    "medium",
    `${totalMisconfigured} share button(s) may be misconfigured (missing x-bind or SVG icon)`,
    "Ensure Alpine share buttons have correct x-bind attribute and contain an SVG icon.",
    undefined,
    evidence,
  )
}

// Dummy link checker (mirrors the standalone Python validator)
const DUMMY_LINK_IGNORE_TEXTS = new Set([
  "skip to main content",
  "contact us",
  "do not sell my personal information",
])

function isDummyHref(href: string | undefined | null): boolean {
  if (!href) return true
  const h = href.trim().toLowerCase()
  return (
    h === "#" ||
    h.startsWith("#") ||
    h === "javascript:void(0)" ||
    h === "javascript:void(0);" ||
    h.startsWith("javascript:")
  )
}

function cleanDummyLinkText(text: string): string {
  if (!text) return "[NO TEXT]"
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  for (const prefix of ["resource", "article"]) {
    if (lower.startsWith(prefix)) return trimmed.slice(prefix.length).trim() || "[NO TEXT]"
  }
  return trimmed
}

// Framework binding attributes that carry the *real* URL at runtime
// (e.g. Vue `:href`, Angular `[href]`, Alpine `x-bind:href`, AngularJS `ng-href`)
const DYNAMIC_HREF_ATTRS = [
  ":href",
  "v-bind:href",
  "[href]",
  "x-bind:href",
  "ng-href",
  "bind-href",
  "@href",
]

// Data-attributes commonly used to stash URLs
const DATA_URL_ATTRS = ["data-href", "data-url", "data-link", "data-target", "data-redirect"]

export function checkDummyLinks($: $Type): CheckResult {
  const dummies: { index: number; text: string; href: string; snippet: string; devtoolsSearch: string }[] = []
  let count = 1

  // Framework text-binding attributes (carry the link label rendered at runtime)
  const TEXT_BINDING_ATTRS = [
    "x-text",
    "x-html",
    "v-text",
    "v-html",
    ":title",
    "v-bind:title",
    "[innerText]",
    "[innerHTML]",
    "[textContent]",
    "ng-bind",
    "ng-bind-html",
  ]

  // Extract any useful identifying text from the anchor or its descendants so
  // users can locate the element manually even when the visible text is
  // rendered by JavaScript.
  const extractIdentifyingText = (el: unknown): string => {
    const $node = $(el as never)
    const directText = $node.text().trim()
    if (directText) return directText

    const node = el as { attribs?: Record<string, string> }
    const attribs = node.attribs || {}

    // 1. Accessibility / SEO labels on the anchor itself
    for (const attr of ["aria-label", "title", "data-tracker-name", "data-label", "data-text"]) {
      if (attribs[attr]) return `${attr}="${attribs[attr]}"`
    }

    // 2. Framework text bindings on the anchor or any descendant
    const collectBindings = (root: unknown): string | null => {
      let found: string | null = null
      $(root as never)
        .find("*")
        .addBack()
        .each((_i, child) => {
          if (found) return
          const cAttribs = (child as { attribs?: Record<string, string> }).attribs || {}
          for (const attr of TEXT_BINDING_ATTRS) {
            if (cAttribs[attr]) {
              found = `${attr}="${cAttribs[attr]}"`
              return
            }
          }
          // Mustache / handlebars-style interpolation inside text nodes
          const innerHtml = $(child as never).html() || ""
          const mustache = innerHtml.match(/\{\{\s*([^}]+?)\s*\}\}/)
          if (mustache) {
            found = `{{ ${mustache[1]} }}`
          }
        })
      return found
    }

    const binding = collectBindings(el)
    if (binding) return binding

    // 3. Image alt text on a child image
    const $img = $node.find("img").first()
    if ($img.length) {
      const alt = $img.attr("alt")
      if (alt) return `img alt="${alt}"`
      const src = $img.attr("src") || $img.attr(":src") || $img.attr("v-bind:src")
      if (src) return `img src="${src}"`
    }

    return "[NO TEXT]"
  }

  $("a").each((_, el) => {
    const $el = $(el)
    const hasHrefAttr = $el.attr("href") !== undefined
    const hrefRaw = $el.attr("href") || ""
    const rawText = $el.text().trim()
    const cleanedText = cleanDummyLinkText(rawText)

    if (DUMMY_LINK_IGNORE_TEXTS.has(cleanedText.trim().toLowerCase())) return
    if (!isDummyHref(hrefRaw)) return

    // Prefer real text; if none, fall back to aria-label, framework bindings, or image alt.
    const text = rawText ? cleanedText : extractIdentifyingText(el)

    // Look for framework binding attributes or data-* URLs that hold the real destination
    const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
    const dynamicParts: string[] = []

    for (const name of DYNAMIC_HREF_ATTRS) {
      if (attribs[name] !== undefined) {
        dynamicParts.push(`${name}="${attribs[name]}" (resolved at runtime)`)
      }
    }
    for (const name of DATA_URL_ATTRS) {
      if (attribs[name] !== undefined) {
        dynamicParts.push(`${name}="${attribs[name]}"`)
      }
    }
    // Inline JS handlers that may navigate
    if (attribs["onclick"]) {
      dynamicParts.push(`onclick="${attribs["onclick"].slice(0, 120)}${attribs["onclick"].length > 120 ? "…" : ""}"`)
    }

    // Human-readable label for the href value
    const hrefLabel = !hasHrefAttr
      ? "(no static href attribute)"
      : hrefRaw === ""
        ? '"" (empty string)'
        : `"${hrefRaw}"`

    const dynamicLabel = dynamicParts.length > 0 ? `  ⟶ dynamic: ${dynamicParts.join("; ")}` : ""

    // Compact outer-HTML snippet so users can locate the anchor in source
    let snippet = ""
    try {
      snippet = ($.html(el) || "").replace(/\s+/g, " ").trim()
      if (snippet.length > 240) snippet = snippet.slice(0, 240) + "…"
    } catch {
      snippet = ""
    }

    // Build a copy-pasteable DevTools search token: a real fragment that exists in the page DOM.
    // Priority: id → unique data-tracker-identifier → unique aria-label → first framework binding
    // attribute → outerHTML opening tag.
    const buildDevToolsSearch = (): string => {
      if (attribs.id) return `#${attribs.id}`
      if (attribs["data-tracker-identifier"] && attribs["aria-label"]) {
        // Combine for a more unique selector pasteable into DevTools Elements search
        return `a[aria-label="${attribs["aria-label"]}"]`
      }
      if (attribs["aria-label"]) return `aria-label="${attribs["aria-label"]}"`
      // Use the first detected framework binding as the search token
      for (const name of DYNAMIC_HREF_ATTRS) {
        if (attribs[name] !== undefined) return `${name}="${attribs[name]}"`
      }
      for (const name of DATA_URL_ATTRS) {
        if (attribs[name] !== undefined) return `${name}="${attribs[name]}"`
      }
      // Fall back to the opening tag from the snippet (first ~120 chars)
      const m = snippet.match(/^<a\b[^>]*>/i)
      return m ? m[0].slice(0, 160) : snippet.slice(0, 160)
    }

    dummies.push({
      index: count,
      text,
      href: hrefLabel + dynamicLabel,
      snippet,
      devtoolsSearch: buildDevToolsSearch(),
    })
    count += 1
  })

  if (dummies.length === 0)
    return pass("dummy-links", "Dummy Links", "Functionality", "No dummy links found on the page")

  return warn(
    "dummy-links",
    "Dummy Links",
    "Functionality",
    "medium",
    `${dummies.length} dummy link(s) found (href="#", "javascript:void(0)", empty, or no static href). Note: scanner reads server HTML only — client-side framework bindings (Vue :href, Angular [href], etc.) appear as "no static href" but the URL resolves at runtime.`,
    "Replace placeholder hrefs with real destinations, remove the link entirely, or — if using framework bindings — verify the binding resolves to a real URL in the browser.",
    undefined,
    dummies.slice(0, 50).flatMap((d) => [
      `[${d.index}] ${d.text} → href=${d.href}`,
      `      DevTools search: ${d.devtoolsSearch}`,
      ...(d.snippet ? [`      Source: ${d.snippet}`] : []),
    ]),
  )
}

// Whitelist of approved badge patterns (mirrors the standalone Python validator)
const BADGE_PATTERNS: { tag: string; requiredClasses: string[]; requiredAttrs: Record<string, string> }[] = [
  { tag: "span", requiredClasses: ["badge", "badge-light", "w-fit"], requiredAttrs: { slot: "title" } },
  { tag: "span", requiredClasses: ["badge", "badge-light"], requiredAttrs: {} },
  { tag: "span", requiredClasses: ["badge", "badge-dark", "self-baseline"], requiredAttrs: { slot: "title" } },
  { tag: "span", requiredClasses: ["badge", "badge-dark"], requiredAttrs: { slot: "title" } },
]

function isAllCapsText(text: string): boolean {
  const letters = text.match(/[A-Za-z]/g)
  if (!letters || letters.length === 0) return false
  return letters.every((ch) => ch === ch.toUpperCase())
}

export function checkBadgeAllCaps($: $Type): CheckResult {
  const matches: { text: string; location: string; allCaps: boolean }[] = []

  $("span").each((_, el) => {
    const $el = $(el)
    const classes = ($el.attr("class") || "").split(/\s+/).filter(Boolean)
    const classSet = new Set(classes)

    const matched = BADGE_PATTERNS.some((p) => {
      if (!p.requiredClasses.every((c) => classSet.has(c))) return false
      for (const [attr, value] of Object.entries(p.requiredAttrs)) {
        if ($el.attr(attr) !== value) return false
      }
      return true
    })
    if (!matched) return

    const text = $el.text().trim()
    const identifier = $el.attr("id") || classes.join(" ") || "span"
    matches.push({ text, location: `<span class="${identifier}">`, allCaps: isAllCapsText(text) })
  })

  if (matches.length === 0)
    return info(
      "badge-caps",
      "Badge Text ALL CAPS",
      "Content",
      "No approved badge patterns found on the page.",
    )

  const violations = matches.filter((m) => !m.allCaps && m.text.length > 0)
  if (violations.length === 0)
    return pass(
      "badge-caps",
      "Badge Text ALL CAPS",
      "Content",
      `${matches.length} approved badge(s) found — all in ALL CAPS`,
      matches.map((m) => m.text).filter(Boolean).join(" | "),
    )

  return warn(
    "badge-caps",
    "Badge Text ALL CAPS",
    "Content",
    "medium",
    `${violations.length}/${matches.length} approved badge(s) are not in ALL CAPS`,
    "Approved badges (span.badge.badge-light / badge-dark variants) must have their text in ALL CAPITAL LETTERS.",
    undefined,
    violations.slice(0, 20).map((v) => `${v.location} → "${v.text}"`),
  )
}

export function checkSubheadStyling($: $Type): CheckResult {
  // Subheads should not be styled as <strong>/<b> in body copy
  const strongLikeHeadings: string[] = []
  $("p > strong:only-child, p > b:only-child").each((_, el) => {
    const t = $(el).text().trim()
    if (t && t.length < 120 && !/[.!?]$/.test(t)) strongLikeHeadings.push(t.slice(0, 80))
  })
  if (strongLikeHeadings.length === 0)
    return pass("subhead-styling", "Subhead Styling", "Content", "No paragraphs styled as bold-only subheads detected")
  return warn(
    "subhead-styling",
    "Subhead Styling",
    "Content",
    "low",
    `${strongLikeHeadings.length} paragraph(s) appear to be styled as <strong> subheads`,
    "Subheads in body copy should be h3/h4/h5/h6 — not <strong>.",
    undefined,
    strongLikeHeadings.slice(0, 10),
  )
}

// ---------- URL ----------

export function checkUrlConvention(url: string): CheckResult {
  const u = new URL(url)
  const path = u.pathname
  const issues: string[] = []
  if (/[A-Z]/.test(path)) issues.push("contains uppercase letters")
  if (/_/.test(path)) issues.push("contains underscores (use hyphens)")
  if (/\s/.test(path)) issues.push("contains spaces")
  if (/[^a-zA-Z0-9\-\/._~]/.test(path)) issues.push("contains special characters")
  if (issues.length)
    return warn(
      "url-convention",
      "URL Convention",
      "SEO",
      "low",
      `URL issues: ${issues.join(", ")}`,
      "Use lowercase, hyphen-separated, ASCII-only URLs.",
      path,
    )
  return pass("url-convention", "URL Convention", "SEO", "URL follows conventions", path)
}

export function checkUrlLength(url: string): CheckResult {
  const u = new URL(url)
  const segments = u.pathname.split("/").filter(Boolean)
  const wordTokens = u.pathname
    .split(/[\/\-_]/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
  const wordCount = wordTokens.length
  const len = url.length
  const issues: string[] = []
  if (wordCount > 7) issues.push(`URL has ${wordCount} words (recommended ≤ 7)`)
  if (len > 100) issues.push(`URL is ${len} characters (recommended ≤ 100)`)
  if (issues.length)
    return warn(
      "url-length",
      "URL Length",
      "SEO",
      "low",
      issues.join("; "),
      "Keep URLs short — under 7 words and 100 characters.",
      u.pathname,
    )
  return pass("url-length", "URL Length", "SEO", `URL length ${len} chars, ${wordCount} word(s), ${segments.length} segment(s)`)
}

// ---------- LINKS ----------

export function extractLinks($: $Type, baseUrl: URL): LinkInfo[] {
  const links: LinkInfo[] = []
  const seen = new Set<string>()
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").trim()
    if (!href) return
    const text = $(el).text().trim().slice(0, 120)
    const target = $(el).attr("target")
    const rel = $(el).attr("rel")
    let resolved = href
    try {
      resolved = new URL(href, baseUrl).toString()
    } catch {}
    const key = resolved + "|" + (target || "")
    if (seen.has(key)) return
    seen.add(key)
    const lower = resolved.toLowerCase()
    let type: LinkInfo["type"] = "other"
    if (href.startsWith("#")) type = "anchor"
    else if (href.startsWith("mailto:")) type = "mailto"
    else if (href.startsWith("tel:")) type = "tel"
    else if (lower.endsWith(".pdf")) type = "pdf"
    else {
      try {
        const u = new URL(resolved)
        type = u.hostname === baseUrl.hostname ? "internal" : "external"
      } catch {}
    }
    links.push({ href: resolved, text, type, target, rel })
  })
  return links
}

export function checkBrokenLinks(links: LinkInfo[]): CheckResult {
  const broken = links.filter((l) => l.ok === false && l.type !== "mailto" && l.type !== "tel" && l.type !== "anchor")
  const checked = links.filter((l) => l.type !== "mailto" && l.type !== "tel" && l.type !== "anchor")
  if (broken.length === 0)
    return {
      ...pass("broken-links", "Broken Links", "Links", `No broken links detected (${checked.length} link(s) checked)`),
      evidence: checked.slice(0, 100).map((l) => `${l.status || "—"} ${l.href}`),
    }
  return fail(
    "broken-links",
    "Broken Links",
    "Links",
    "critical",
    `${broken.length} broken link(s) found`,
    "Fix or remove broken links.",
    undefined,
    broken.slice(0, 10).map((l) => `${l.status || "ERR"} ${l.href}${l.error ? ` (${l.error})` : ""}`),
  )
}

export function checkRedirects(links: LinkInfo[]): CheckResult {
  const redirects = links.filter((l) => l.redirected && l.ok)
  if (redirects.length === 0) return pass("redirects", "Redirect Links", "Links", "No redirected links detected")
  return warn(
    "redirects",
    "Redirect Links",
    "Links",
    "low",
    `${redirects.length} redirected link(s)`,
    "Update links to point to final URLs.",
    undefined,
    redirects.slice(0, 10).map((l) => `${l.href} → ${l.finalUrl}`),
  )
}

export function checkExternalNewTab(links: LinkInfo[]): CheckResult {
  const ext = links.filter((l) => l.type === "external")
  const bad = ext.filter((l) => l.target !== "_blank")
  if (ext.length === 0) return info("ext-new-tab", "External Links Open in New Tab", "Functionality", "No external links found.")
  if (bad.length === 0)
    return {
      ...pass("ext-new-tab", "External Links Open in New Tab", "Functionality", `${ext.length} external links — all open in new tab`),
      evidence: ext.slice(0, 100).map((l) => `${l.href}${l.text ? ` — "${l.text}"` : ""}`),
    }
  return warn(
    "ext-new-tab",
    "External Links Open in New Tab",
    "Functionality",
    "medium",
    `${bad.length}/${ext.length} external links missing target="_blank"`,
    'Add target="_blank" rel="noopener noreferrer" to external links.',
    undefined,
    bad.slice(0, 100).map((l) => `[MISSING target="_blank"] ${l.href}${l.text ? ` — "${l.text}"` : ""}`),
  )
}

export function checkInternalSameTab(links: LinkInfo[]): CheckResult {
  const internal = links.filter((l) => l.type === "internal")
  const bad = internal.filter((l) => l.target === "_blank")
  if (internal.length === 0) return info("int-same-tab", "Internal Links Open in Same Tab", "Functionality", "No internal links found.")
  if (bad.length === 0)
    return {
      ...pass("int-same-tab", "Internal Links Open in Same Tab", "Functionality", `${internal.length} internal links — all open in same tab`),
      evidence: internal.slice(0, 100).map((l) => `${l.href}${l.text ? ` — "${l.text}"` : ""}`),
    }
  return warn(
    "int-same-tab",
    "Internal Links Open in Same Tab",
    "Functionality",
    "low",
    `${bad.length}/${internal.length} internal links open in new tab`,
    "Internal links should generally open in the same tab.",
    undefined,
    bad.slice(0, 10).map((l) => l.href),
  )
}

export function checkPdfsNewTab(links: LinkInfo[]): CheckResult {
  const pdfs = links.filter((l) => l.type === "pdf")
  if (pdfs.length === 0) return info("pdf-new-tab", "PDFs Open in New Tab", "Functionality", "No PDF links found.")
  const bad = pdfs.filter((l) => l.target !== "_blank")
  if (bad.length === 0)
    return {
      ...pass("pdf-new-tab", "PDFs Open in New Tab", "Functionality", `${pdfs.length} PDF link(s) — all open in new tab`),
      evidence: pdfs.slice(0, 100).map((l) => `${l.href}${l.text ? ` — "${l.text}"` : ""}`),
    }
  return warn(
    "pdf-new-tab",
    "PDFs Open in New Tab",
    "Functionality",
    "medium",
    `${bad.length}/${pdfs.length} PDF links missing target="_blank"`,
    'PDF links should open in a new tab to avoid losing the user&apos;s place.',
    undefined,
    bad.slice(0, 10).map((l) => l.href),
  )
}

export function checkLinkRelSecurity(links: LinkInfo[]): CheckResult {
  const ext = links.filter((l) => l.type === "external" && l.target === "_blank")
  const bad = ext.filter((l) => !/noopener/i.test(l.rel || "") || !/noreferrer/i.test(l.rel || ""))
  if (ext.length === 0) return info("rel-security", "External Link Security (rel)", "Technical", "No external _blank links found.")
  if (bad.length === 0)
    return {
      ...pass("rel-security", "External Link Security (rel)", "Technical", `${ext.length} external _blank link(s) — all have proper rel attributes`),
      evidence: ext.slice(0, 100).map((l) => `${l.href} (rel="${l.rel || ""}")`),
    }
  return warn(
    "rel-security",
    "External Link Security (rel)",
    "Technical",
    "medium",
    `${bad.length} external links missing rel="noopener noreferrer"`,
    'Add rel="noopener noreferrer" to all external target="_blank" links.',
    undefined,
    bad.slice(0, 10).map((l) => l.href),
  )
}

// ---------- IMAGES ----------

export function extractImages($: $Type, baseUrl: URL): ImageInfo[] {
  const imgs: ImageInfo[] = []
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || ""
    let resolved = src
    try {
      resolved = new URL(src, baseUrl).toString()
    } catch {}
    const alt = $(el).attr("alt")
    imgs.push({
      src: resolved,
      alt: alt ?? null,
      hasAlt: alt !== undefined,
      width: $(el).attr("width"),
      height: $(el).attr("height"),
    })
  })
  return imgs
}

export function checkImageAlt(images: ImageInfo[]): CheckResult {
  if (images.length === 0) return info("img-alt", "Image Alt Text", "Accessibility", "No images on page.")
  const missing = images.filter((i) => !i.hasAlt)
  if (missing.length === 0)
    return {
      ...pass("img-alt", "Image Alt Text", "Accessibility", `All ${images.length} images have alt attributes`),
      evidence: images.slice(0, 100).map((i) => `${i.src} — alt="${i.alt ?? ""}"`),
    }
  return fail(
    "img-alt",
    "Image Alt Text",
    "Accessibility",
    "high",
    `${missing.length}/${images.length} images missing alt attribute`,
    "Add descriptive alt text to every image (use alt=\"\" for decorative).",
    undefined,
    missing.slice(0, 10).map((i) => i.src),
  )
}

// ---------- CONTENT ----------

export function checkTitleMatchesH1($: $Type): CheckResult {
  const title = $("title").first().text().trim().toLowerCase()
  const h1 = $("h1").first().text().trim().toLowerCase()
  if (!title || !h1) return info("title-h1-match", "Title Matches Headline", "Content", "Missing title or H1.")
  // Looser comparison: tokens overlap
  const t = new Set(title.split(/[^a-z0-9]+/).filter((w) => w.length > 3))
  const h = new Set(h1.split(/[^a-z0-9]+/).filter((w) => w.length > 3))
  let overlap = 0
  t.forEach((w) => h.has(w) && overlap++)
  const ratio = t.size === 0 ? 0 : overlap / t.size
  if (ratio >= 0.4)
    return pass("title-h1-match", "Title Matches Headline", "Content", "Title and H1 are reasonably aligned")
  return warn(
    "title-h1-match",
    "Title Matches Headline",
    "Content",
    "low",
    "Title and H1 differ significantly",
    "Align <title> and H1 for clarity & SEO.",
  )
}

export function checkTrademarkSuperscript($: $Type): CheckResult {
  // Get all visible body text and count ™/® symbols using Cheerio for consistency
  // We need to check text nodes that are NOT inside <sup> tags
  
  let insideSup = 0
  let outsideSup = 0
  const violations: string[] = []
  
  // Count symbols inside <sup> tags (properly formatted)
  $("sup").each((_, el) => {
    const text = $(el).text()
    const count = (text.match(/[™®]/g) || []).length
    insideSup += count
  })
  
  // Count symbols in body text that are NOT inside <sup>
  // We check common content containers and look for text nodes with symbols
  $("p, span, div, li, td, th, h1, h2, h3, h4, h5, h6, a, strong, em, b, i").each((_, el) => {
    const $el = $(el)
    // Get only direct text content (not from child elements)
    const directText = $el.contents().filter(function() {
      return (this as any).type === "text"
    }).text()
    
    const symbols = directText.match(/[™®]/g) || []
    if (symbols.length > 0) {
      outsideSup += symbols.length
      const snippet = directText.trim().slice(0, 60)
      if (snippet && violations.length < 10) {
        violations.push(`"${snippet}..." contains ${symbols.length} symbol(s) not in <sup>`)
      }
    }
  })
  
  const total = insideSup + outsideSup
  
  if (total === 0)
    return info(
      "trademark",
      "Trademark Superscript",
      "Content",
      "No trademark symbols (™/®) found on the page.",
    )
  
  if (outsideSup === 0)
    return pass(
      "trademark",
      "Trademark Superscript",
      "Content",
      `${total} trademark symbol(s) found — all properly wrapped in <sup>`,
      `${insideSup} symbol(s) correctly in <sup> tags`,
    )
  
  return warn(
    "trademark",
    "Trademark Superscript",
    "Content",
    "low",
    `${outsideSup}/${total} trademark symbol(s) not wrapped in <sup>`,
    "Wrap ™ and ® in <sup> for proper typography.",
    undefined,
    [`Total: ${total}`, `In <sup>: ${insideSup}`, `Not in <sup>: ${outsideSup}`, ...violations],
  )
}

export function checkSpelling(textContent: string): CheckResult {
  // Light heuristic spell check: common misspellings
  const commonTypos: Record<string, string> = {
    teh: "the",
    recieve: "receive",
    seperate: "separate",
    occured: "occurred",
    untill: "until",
    accomodate: "accommodate",
    definately: "definitely",
    enviroment: "environment",
    publically: "publicly",
    occassion: "occasion",
    neccessary: "necessary",
    occurence: "occurrence",
    independant: "independent",
    refered: "referred",
    succesful: "successful",
    tommorow: "tomorrow",
    untill2: "until",
  }
  const found: string[] = []
  const lower = textContent.toLowerCase()
  for (const typo of Object.keys(commonTypos)) {
    const re = new RegExp(`\\b${typo}\\b`, "g")
    if (re.test(lower)) found.push(`${typo} → ${commonTypos[typo]}`)
  }
  if (found.length === 0)
    return pass("spell-check", "Spell Check (heuristic)", "Content", "No common misspellings detected")
  return warn(
    "spell-check",
    "Spell Check (heuristic)",
    "Content",
    "low",
    `${found.length} potential misspelling(s) found`,
    "Run a full spell-check tool for thorough coverage.",
    undefined,
    found,
  )
}

// ---------- FUNCTIONALITY ----------

export function checkContactForm($: $Type): CheckResult {
  const forms = $("form")
  if (forms.length === 0) return info("contact-form", "Contact Form Submission", "Functionality", "No <form> elements found on the page.")
  let candidateEl: any = null
  forms.each((_, el) => {
    const html = $(el).html()?.toLowerCase() || ""
    if (/email|contact|name|message|phone/.test(html)) candidateEl = el
  })
  if (!candidateEl) return info("contact-form", "Contact Form Submission", "Functionality", "No contact-like form detected.")
  const hasSubmit = $(candidateEl).find('button[type="submit"], input[type="submit"]').length > 0
  if (!hasSubmit)
    return warn(
      "contact-form",
      "Contact Form Submission",
      "Functionality",
      "medium",
      "Contact form has no submit button",
      "Ensure the form has an accessible submit button.",
    )
  return pass(
    "contact-form",
    "Contact Form Submission",
    "Functionality",
    "Contact-like form detected with submit button (manual end-to-end test recommended)",
  )
}

export function checkInternalSearch($: $Type): CheckResult {
  const search =
    $('input[type="search"], input[name*="search" i], input[id*="search" i], form[role="search"]').length
  if (search > 0) return pass("internal-search", "Internal Search", "Functionality", "Search input detected")
  return info("internal-search", "Internal Search", "Functionality", "No internal search input found.")
}

export function checkVideoTranscript($: $Type): CheckResult {
  const videos = $("video, iframe[src*='youtube'], iframe[src*='vimeo']").length
  if (videos === 0) return info("video-transcript", "Video Transcript", "Accessibility", "No video elements found.")
  const text = $("body").text().toLowerCase()
  const hasTranscript = /transcript/i.test(text)
  if (hasTranscript)
    return pass("video-transcript", "Video Transcript", "Accessibility", `Video(s) found and 'transcript' keyword present`)
  return warn(
    "video-transcript",
    "Video Transcript",
    "Accessibility",
    "medium",
    `${videos} video(s) detected without obvious transcript`,
    "Provide a transcript or captions for video content (WCAG 1.2).",
  )
}

export function checkMultimediaPlayback($: $Type): CheckResult {
  const media = $("video, audio").length + $("iframe[src*='youtube'], iframe[src*='vimeo']").length
  if (media === 0) return info("multimedia", "Multimedia Playback", "Functionality", "No multimedia elements found.")
  return pass("multimedia", "Multimedia Playback", "Functionality", `${media} multimedia element(s) found (manual playback test recommended)`)
}

export function checkRegionLanguage($: $Type): CheckResult {
  const lang = $("html").attr("lang")
  if (!lang) return fail("region-lang", "Region/Language", "Accessibility", "high", "Missing <html lang> attribute", "Add lang attribute (e.g., lang=\"en\").")
  return pass("region-lang", "Region/Language", "Accessibility", `Language declared: ${lang}`)
}

export function checkEyebrowText($: $Type): CheckResult {
  const eyebrows: string[] = []
  $('[class*="eyebrow" i]').each((_, el) => {
    const t = $(el).text().trim()
    if (t) eyebrows.push(t)
  })
  if (eyebrows.length === 0) return info("eyebrow", "Eyebrow Text", "Content", "No eyebrow text component detected.")
  const notUpper = eyebrows.filter((t) => {
    const letters = t.replace(/[^A-Za-z]/g, "")
    return letters && letters !== letters.toUpperCase()
  })
  if (notUpper.length === 0)
    return pass("eyebrow", "Eyebrow Text", "Content", `${eyebrows.length} eyebrow(s) — all in ALL CAPS`, eyebrows.join(" | "))
  return warn(
    "eyebrow",
    "Eyebrow Text",
    "Content",
    "low",
    `${notUpper.length}/${eyebrows.length} eyebrow(s) are not in ALL CAPS`,
    "Eyebrow text should be in ALL CAPITAL LETTERS.",
    undefined,
    notUpper.slice(0, 10),
  )
}

export function checkCtaText($: $Type): CheckResult {
  const ctas: string[] = []
  $('a[class*="cta" i], button, a[class*="button" i]').each((_, el) => {
    const t = $(el).text().trim()
    if (t) ctas.push(t)
  })
  const generic = ctas.filter((t) => /^(click here|here|read more|learn more|more)$/i.test(t.trim()))
  if (ctas.length === 0) return info("cta", "CTA Text", "Content", "No CTA buttons detected.")
  if (generic.length > 0)
    return warn(
      "cta",
      "CTA Text",
      "Content",
      "low",
      `${generic.length} generic CTA(s) detected (e.g., "Click here", "Read more")`,
      "Use descriptive, action-oriented CTAs.",
      undefined,
      generic,
    )
  return {
    ...pass("cta", "CTA Text", "Content", `${ctas.length} CTA(s) reviewed`),
    evidence: ctas.slice(0, 100).map((t, i) => `[${i + 1}] "${t}"`),
  }
}

// ---------- TECHNICAL ----------

export function checkWebPageTagging($: $Type): CheckResult {
  const html = $.html()
  const checks = {
    GTM: /googletagmanager\.com|GTM-/i.test(html),
    GA: /gtag\(|google-analytics\.com|UA-\d+|G-[A-Z0-9]+/i.test(html),
    Adobe: /adobedtm|launch-/.test(html),
  }
  const present = Object.entries(checks).filter(([, v]) => v).map(([k]) => k)
  if (present.length === 0)
    return warn("tagging", "Web Page Tagging", "Technical", "medium", "No analytics tagging detected", "Add GTM/GA/Adobe tagging.")
  return pass("tagging", "Web Page Tagging", "Technical", `Tagging detected: ${present.join(", ")}`)
}

export function checkCampaignId(url: string): CheckResult {
  const u = new URL(url)
  const params = ["utm_campaign", "utm_source", "utm_medium", "campaignid", "cid"]
  const found = params.filter((p) => u.searchParams.has(p))
  if (found.length === 0)
    return info("campaign-id", "Campaign ID", "Technical", "No campaign tracking parameters in URL.")
  return pass("campaign-id", "Campaign ID", "Technical", `Campaign params found: ${found.join(", ")}`)
}

export function checkPageSpeed(fetchTimeMs: number, pageSizeBytes: number): CheckResult {
  const sizeKb = Math.round(pageSizeBytes / 1024)
  if (fetchTimeMs < 1000 && sizeKb < 1500)
    return pass("page-speed", "Page Speed", "Performance", `Loaded in ${fetchTimeMs}ms, size ${sizeKb}KB`)
  if (fetchTimeMs > 3000)
    return fail(
      "page-speed",
      "Page Speed",
      "Performance",
      "high",
      `Slow response: ${fetchTimeMs}ms (size ${sizeKb}KB)`,
      "Optimize server response, enable caching/CDN.",
    )
  return warn("page-speed", "Page Speed", "Performance", "medium", `Response: ${fetchTimeMs}ms, size ${sizeKb}KB`)
}

export function checkMobileSeo($: $Type): CheckResult {
  const viewport = $('meta[name="viewport"]').attr("content")
  if (!viewport) return fail("mobile", "Mobile SEO", "Mobile", "high", "Missing viewport meta tag", "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.")
  return pass("mobile", "Mobile SEO", "Mobile", "Viewport meta tag present", viewport)
}

export function checkAuthentication($: $Type): CheckResult {
  const loginIndicators =
    $('input[type="password"], a[href*="login" i], a[href*="signin" i], button:contains("Sign in")').length
  if (loginIndicators === 0) return info("auth", "Authentication", "Functionality", "No authentication elements detected.")
  return pass("auth", "Authentication", "Functionality", `${loginIndicators} authentication element(s) detected (manual test recommended)`)
}

export function checkCopyLink($: $Type): CheckResult {
  const html = $.html().toLowerCase()
  if (/copy\s*link|share[- ]link/.test(html))
    return pass("copy-link", "Copy Link Functionality", "Functionality", "Copy link feature detected (manual test recommended)")
  return info("copy-link", "Copy Link Functionality", "Functionality", "No copy-link feature detected.")
}

export function checkTocFootnotes($: $Type): CheckResult {
  const toc = $('[class*="toc" i], [id*="toc" i], nav[aria-label*="contents" i]').length
  const fn = $('[class*="footnote" i], [id*="footnote" i], sup a[href^="#"]').length
  const parts: string[] = []
  if (toc) parts.push(`TOC (${toc})`)
  if (fn) parts.push(`Footnotes (${fn})`)
  if (parts.length === 0)
    return info("toc-fn", "Table of Contents & Footnotes", "Content", "No TOC/footnotes detected.")
  return pass("toc-fn", "Table of Contents & Footnotes", "Content", parts.join(", "))
}

  export function checkInsightsFilter($: $Type): CheckResult {
    // Tailwind / utility class fragments that contain the word "filter" but are NOT filter UI.
    const UTILITY_FILTER_CLASS = /^(backdrop-filter|filter-none|filter-blur|drop-shadow-filter|filter|filters?-[a-z]+-blur|backdrop-blur)$/i

    const hasMeaningfulFilterClass = (className: string): boolean => {
      const tokens = className.split(/\s+/).filter(Boolean)
      const filterTokens = tokens.filter((t) => /filter/i.test(t))
      if (filterTokens.length === 0) return false
      return filterTokens.some((t) => !UTILITY_FILTER_CLASS.test(t))
    }

    const matches: { reason: string; snippet: string; devtoolsSearch: string }[] = []
    const seen = new Set<unknown>()

    const record = (el: unknown, reason: string) => {
      if (seen.has(el)) return
      seen.add(el)
      const $el = $(el as never)
      const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
      let snippet = ""
      try {
        snippet = ($.html(el as never) || "").replace(/\s+/g, " ").trim()
        if (snippet.length > 200) snippet = snippet.slice(0, 200) + "…"
      } catch {
        // ignore
      }
      const devtoolsSearch = attribs.id
        ? `#${attribs.id}`
        : attribs["aria-label"]
          ? `aria-label="${attribs["aria-label"]}"`
          : attribs["data-filter"] !== undefined
            ? `data-filter="${attribs["data-filter"]}"`
            : (snippet.match(/^<\w+\b[^>]*>/i)?.[0] ?? snippet).slice(0, 160)
      const text = $el.text().trim().replace(/\s+/g, " ").slice(0, 60)
      matches.push({
        reason: `${reason}${text ? ` — "${text}"` : ""}`,
        snippet,
        devtoolsSearch,
      })
    }

    // 1) Explicit data attributes used by real filter UIs
    $("[data-filter], [data-facet], [data-filter-group], [data-filter-name]").each((_, el) => {
      record(el, "data-filter attribute")
    })

    // 2) Containers whose class/id meaningfully mentions "filter" — must contain a real control
    $("[class], [id]").each((_, el) => {
      const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
      const cls = attribs.class || ""
      const id = attribs.id || ""
      const classOk = cls && hasMeaningfulFilterClass(cls)
      const idOk = id && /filter/i.test(id) && !/^(filter|backdrop-filter)$/i.test(id)
      if (!classOk && !idOk) return
      const $el = $(el as never)
      const innerControls = $el.find("select, button, input[type='checkbox'], input[type='radio'], [role='listbox'], [role='combobox']").length
      const role = (attribs.role || "").toLowerCase()
      const ariaLabel = (attribs["aria-label"] || "").toLowerCase()
      if (innerControls === 0 && role !== "search" && !/filter|sort/.test(ariaLabel)) return
      record(el, `class/id mentions "filter"`)
    })

    // 3) Form controls whose own label/name/id explicitly references filter or sort by
    $("select, button, input").each((_, el) => {
      const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
      const bag = [
        attribs["aria-label"],
        attribs["name"],
        attribs["id"],
        attribs["data-tracker-identifier"],
        attribs["data-label"],
        $(el as never).text(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (/\b(filter|filters|sort by|sort-by|facet)\b/.test(bag)) {
        record(el, "control label mentions filter/sort")
      }
    })

    // 4) Elements explicitly marked as the search/filter region
    $('[role="search"]').each((_, el) => record(el, 'role="search"'))

    if (matches.length === 0) {
      return info("insights-filter", "Insights Hub Filter", "Functionality", "No filter UI detected.")
    }

    return {
      ...pass(
        "insights-filter",
        "Insights Hub Filter",
        "Functionality",
        `${matches.length} filter control(s) detected (manual test recommended)`,
      ),
      evidence: matches.slice(0, 30).flatMap((m, i) => [
        `[${i + 1}] ${m.reason}`,
        `      DevTools search: ${m.devtoolsSearch}`,
        `      Source: ${m.snippet}`,
      ]),
    }
  }

  export function checkGatedFormDownload($: $Type): CheckResult {
    const describe = (el: unknown): { reason: string; devtoolsSearch: string; snippet: string } => {
      const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
      const $el = $(el as never)
      let snippet = ""
      try {
        snippet = ($.html(el as never) || "").replace(/\s+/g, " ").trim()
        if (snippet.length > 200) snippet = snippet.slice(0, 200) + "…"
      } catch {
        // ignore
      }
      const devtoolsSearch = attribs.id
        ? `#${attribs.id}`
        : attribs["aria-label"]
          ? `aria-label="${attribs["aria-label"]}"`
          : attribs.name
            ? `name="${attribs.name}"`
            : attribs.action
              ? `action="${attribs.action}"`
              : attribs.href
                ? `href="${attribs.href}"`
                : (snippet.match(/^<\w+\b[^>]*>/i)?.[0] ?? snippet).slice(0, 160)
      const text = $el.text().trim().replace(/\s+/g, " ").slice(0, 80)
      const labelBits = [
        attribs.id && `id=${attribs.id}`,
        attribs["aria-label"] && `aria-label="${attribs["aria-label"]}"`,
        attribs.action && `action="${attribs.action}"`,
        attribs.name && `name="${attribs.name}"`,
        attribs.href && `href="${attribs.href}"`,
        text && `text="${text}"`,
      ].filter(Boolean)
      return { reason: labelBits.join(" | ") || "(no identifying attributes)", devtoolsSearch, snippet }
    }

    const forms: ReturnType<typeof describe>[] = []
    $("form").each((_, el) => {
      forms.push(describe(el))
    })

    const downloads: ReturnType<typeof describe>[] = []
    $('a[href$=".pdf" i], a[download], a[href*=".pdf?" i]').each((_, el) => {
      downloads.push(describe(el))
    })

    if (forms.length === 0 && downloads.length === 0) {
      return info("gated-form", "Gated Form Download CTA", "Functionality", "No gated download pattern detected.")
    }

    // Heuristic: a true gating association requires the form OR a download to mention
    // gating/resource terminology. Without that, we can't infer that the form actually
    // gates the download (it might be a newsletter/search/contact form unrelated to any PDF).
    const GATING_TERMS =
      /\b(gated|download|get the (report|guide|paper)|white\s?paper|whitepaper|e-?book|case study|resource|register|request|access|unlock|get access)\b/i
    const anyGatingSignal =
      forms.some((f) => GATING_TERMS.test(f.reason) || GATING_TERMS.test(f.snippet)) ||
      downloads.some((d) => GATING_TERMS.test(d.reason) || GATING_TERMS.test(d.snippet))

    const headline =
      forms.length > 0 && downloads.length > 0
        ? `${forms.length} form(s) and ${downloads.length} download(s) detected${
            anyGatingSignal ? "" : " — no gating association inferred (forms may be unrelated to downloads)"
          }`
        : forms.length > 0
          ? `${forms.length} form(s) detected, no downloads found`
          : `${downloads.length} download(s) detected, no forms found`

    const evidence: string[] = []
    if (forms.length > 0) {
      evidence.push(`Forms (${forms.length}):`)
      forms.slice(0, 20).forEach((f, i) => {
        evidence.push(`  [F${i + 1}] ${f.reason}`)
        evidence.push(`        DevTools search: ${f.devtoolsSearch}`)
        evidence.push(`        Source: ${f.snippet}`)
      })
    }
    if (downloads.length > 0) {
      evidence.push(`Downloads (${downloads.length}):`)
      downloads.slice(0, 20).forEach((d, i) => {
        evidence.push(`  [D${i + 1}] ${d.reason}`)
        evidence.push(`        DevTools search: ${d.devtoolsSearch}`)
        evidence.push(`        Source: ${d.snippet}`)
      })
    }

    const base =
      forms.length > 0 && downloads.length > 0 && anyGatingSignal
        ? pass("gated-form", "Gated Form Download CTA", "Functionality", headline)
        : info("gated-form", "Gated Form Download CTA", "Functionality", headline)

    return { ...base, evidence }
  }

export function checkGatedPdfPath(links: LinkInfo[]): CheckResult {
  const pdfs = links.filter((l) => l.type === "pdf")
  if (pdfs.length === 0) return info("gated-pdf", "Secure PDFs Under /gated/", "Technical", "No PDF links found.")
  // Heuristic: confidential / secure keywords near link text imply gated requirement
  const suspicious = pdfs.filter((l) => {
    const t = (l.text || "").toLowerCase()
    const isConfidential = /confidential|secure|private|restricted|internal|gated/.test(t)
    const inGated = /\/gated\//i.test(l.href)
    return isConfidential && !inGated
  })
  if (suspicious.length === 0)
    return pass(
      "gated-pdf",
      "Secure PDFs Under /gated/",
      "Technical",
      `${pdfs.length} PDF(s) reviewed — no confidential PDFs outside /gated/ detected`,
    )
  return warn(
    "gated-pdf",
    "Secure PDFs Under /gated/",
    "Technical",
    "medium",
    `${suspicious.length} confidential-looking PDF(s) are not under /gated/`,
    "Move secure/confidential PDFs into a /gated/ folder path.",
    undefined,
    suspicious.slice(0, 10).map((l) => l.href),
  )
}

export function checkContentFormatting($: $Type): CheckResult {
  const issues: string[] = []
  const paragraphs = $("p")
  let longParas = 0
  paragraphs.each((_, el) => {
    if ($(el).text().split(/\s+/).length > 150) longParas++
  })
  if (longParas > 0) issues.push(`${longParas} long paragraph(s) (>150 words)`)
  const emptyLinks = $("a[href]").filter((_, el) => !$(el).text().trim() && !$(el).find("img[alt]").length).length
  if (emptyLinks > 0) issues.push(`${emptyLinks} empty link(s)`)
  if (issues.length === 0) return pass("content-format", "Content Formatting", "Content", "No formatting issues detected")
  return warn(
    "content-format",
    "Content Formatting",
    "Content",
    "low",
    issues.join("; "),
    "Break long paragraphs and add text to all links.",
  )
}

export function checkGoogleIndexing($: $Type, url: string): CheckResult {
  const robots = $('meta[name="robots"]').attr("content")?.toLowerCase() || ""
  const blocked = /noindex|none/.test(robots)
  if (blocked)
    return fail(
      "google-index",
      "Google Indexing",
      "SEO",
      "high",
      "Page is blocked from indexing",
      "Remove noindex directive if the page should appear in search results.",
      robots,
    )
  return pass("google-index", "Google Indexing", "SEO", "Page appears indexable", `Verify in Google Search Console for ${new URL(url).origin}`)
}

export function checkFigmaAlignment(): CheckResult {
  return info(
    "figma",
    "Content Alignment with Figma",
    "Content",
    "Manual review required — compare rendered page to Figma designs.",
  )
}

export function checkCrossBrowser(): CheckResult {
  return info(
    "cross-browser",
    "Cross-browser & Device Testing",
    "Functionality",
    "Manual or automated cross-browser test (e.g., BrowserStack) required.",
  )
}

// ---------- ACCESSIBILITY ADDITIONS ----------

export function checkHtmlLangAttr($: $Type): CheckResult {
  const lang = $("html").attr("lang")
  if (!lang) {
    return fail(
      "html-lang",
      "HTML lang Attribute",
      "Accessibility",
      "high",
      "<html> is missing the lang attribute.",
      'Set <html lang="en"> (or the appropriate locale) so screen readers use the correct pronunciation rules.',
    )
  }
  if (!/^[a-zA-Z]{2,3}(-[A-Za-z0-9]+)*$/.test(lang)) {
    return warn(
      "html-lang",
      "HTML lang Attribute",
      "Accessibility",
      "medium",
      `<html lang="${lang}"> does not look like a valid BCP 47 tag.`,
      'Use a valid tag like "en", "en-US", or "fr-CA".',
    )
  }
  const dir = $("html").attr("dir") || "(not set)"
  return {
    ...pass("html-lang", "HTML lang Attribute", "Accessibility", `lang="${lang}"`),
    evidence: [`<html lang="${lang}" dir="${dir}">`, `DevTools search: html[lang="${lang}"]`],
  }
}

export function checkSkipToMainLink($: $Type): CheckResult {
  const candidates = $('a[href^="#"]').filter((_i, el) => {
    const text = $(el).text().trim().toLowerCase()
    const aria = ($(el).attr("aria-label") || "").toLowerCase()
    return /skip( to)?\s+(main|content|navigation)/.test(text) || /skip( to)?\s+(main|content|navigation)/.test(aria)
  })
  if (candidates.length === 0) {
    return warn(
      "skip-link",
      "Skip to Main Content Link",
      "Accessibility",
      "medium",
      "No 'Skip to main content' link found.",
      "Add a visually-hidden 'Skip to main content' link as the first focusable element for keyboard users.",
    )
  }
  const evidence = candidates.toArray().slice(0, 10).map((el, i) => {
    const a = (el as { attribs?: Record<string, string> }).attribs || {}
    const text = $(el as never).text().trim().slice(0, 80)
    return `[${i + 1}] <a href="${a.href}"${a["aria-label"] ? ` aria-label="${a["aria-label"]}"` : ""}>${text}</a>`
  })
  return {
    ...pass("skip-link", "Skip to Main Content Link", "Accessibility", `${candidates.length} skip link(s) detected`),
    evidence,
  }
}

export function checkFormLabels($: $Type): CheckResult {
  const controls = $("input, select, textarea").toArray().filter((el) => {
    const type = ($(el as never).attr("type") || "").toLowerCase()
    return !["hidden", "submit", "button", "reset", "image"].includes(type)
  })
  if (controls.length === 0) {
    return info("form-labels", "Form Control Labels", "Accessibility", "No labelable form controls found.")
  }
  const missing: string[] = []
  controls.forEach((el, i) => {
    const $el = $(el as never)
    const id = $el.attr("id")
    const ariaLabel = $el.attr("aria-label")
    const ariaLabelledBy = $el.attr("aria-labelledby")
    const title = $el.attr("title")
    const placeholder = $el.attr("placeholder")
    const hasLabelFor = id ? $(`label[for="${id}"]`).length > 0 : false
    const wrappedByLabel = $el.parents("label").length > 0
    if (!hasLabelFor && !wrappedByLabel && !ariaLabel && !ariaLabelledBy && !title) {
      const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
      let snippet = ""
      try {
        snippet = ($.html(el as never) || "").replace(/\s+/g, " ").trim().slice(0, 180)
      } catch {
        // ignore
      }
      const search = id
        ? `#${id}`
        : attribs.name
          ? `name="${attribs.name}"`
          : placeholder
            ? `placeholder="${placeholder}"`
            : snippet.slice(0, 120)
      missing.push(`[${missing.length + 1}] <${(el as { name?: string }).name || "control"}> ${search}  |  ${snippet}`)
    }
    void i
  })
  if (missing.length === 0) {
    const evidence = controls.slice(0, 30).map((el, i) => {
      const a = (el as { attribs?: Record<string, string> }).attribs || {}
      const tag = (el as { name?: string }).name || "control"
      const labelMethod = a.id && $(`label[for="${a.id}"]`).length > 0
        ? `<label for="${a.id}">`
        : $(el as never).parents("label").length > 0
          ? "wrapping <label>"
          : a["aria-label"]
            ? `aria-label="${a["aria-label"]}"`
            : a["aria-labelledby"]
              ? `aria-labelledby="${a["aria-labelledby"]}"`
              : `title="${a.title}"`
      return `[${i + 1}] <${tag}${a.type ? ` type="${a.type}"` : ""}${a.name ? ` name="${a.name}"` : ""}> labeled via ${labelMethod}`
    })
    return { ...pass("form-labels", "Form Control Labels", "Accessibility", `${controls.length} control(s) all labeled`), evidence }
  }
  return {
    ...fail(
      "form-labels",
      "Form Control Labels",
      "Accessibility",
      "high",
      `${missing.length} of ${controls.length} form control(s) missing an accessible label.`,
      "Add a <label for> association, wrap the control in <label>, or set aria-label / aria-labelledby.",
    ),
    evidence: missing.slice(0, 30),
  }
}

export function checkButtonAccessibleName($: $Type): CheckResult {
  const buttons = $("button, [role='button']").toArray()
  if (buttons.length === 0) {
    return info("btn-name", "Button Accessible Names", "Accessibility", "No buttons found.")
  }
  const missing: string[] = []
  buttons.forEach((el) => {
    const $el = $(el as never)
    const text = $el.text().trim()
    const ariaLabel = $el.attr("aria-label")
    const ariaLabelledBy = $el.attr("aria-labelledby")
    const title = $el.attr("title")
    const hasImgAlt = $el.find("img[alt]").filter((_i, img) => !!($(img as never).attr("alt") || "").trim()).length > 0
    if (!text && !ariaLabel && !ariaLabelledBy && !title && !hasImgAlt) {
      const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
      let snippet = ""
      try {
        snippet = ($.html(el as never) || "").replace(/\s+/g, " ").trim().slice(0, 180)
      } catch {
        // ignore
      }
      const search = attribs.id
        ? `#${attribs.id}`
        : attribs.class
          ? `.${attribs.class.split(/\s+/)[0]}`
          : snippet.slice(0, 120)
      missing.push(`[${missing.length + 1}] ${search}  |  ${snippet}`)
    }
  })
  if (missing.length === 0) {
    const evidence = buttons.slice(0, 20).map((el, i) => {
      const $el = $(el as never)
      const a = (el as { attribs?: Record<string, string> }).attribs || {}
      const text = $el.text().trim().slice(0, 80)
      const name = text || a["aria-label"] || a.title || ""
      const source = text ? "text" : a["aria-label"] ? "aria-label" : a.title ? "title" : "img alt"
      return `[${i + 1}] "${name}" (${source})`
    })
    return { ...pass("btn-name", "Button Accessible Names", "Accessibility", `${buttons.length} button(s) all named`), evidence }
  }
  return {
    ...fail(
      "btn-name",
      "Button Accessible Names",
      "Accessibility",
      "high",
      `${missing.length} button(s) have no accessible name (no text, aria-label, or alt).`,
      "Add visible text, aria-label, aria-labelledby, or an alt'd <img> inside the button.",
    ),
    evidence: missing.slice(0, 30),
  }
}

export function checkIframeTitle($: $Type): CheckResult {
  const iframes = $("iframe").toArray()
  if (iframes.length === 0) {
    return info("iframe-title", "Iframe Titles", "Accessibility", "No iframes found.")
  }
  const missing: string[] = []
  iframes.forEach((el) => {
    const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
    const title = (attribs.title || "").trim()
    const ariaLabel = (attribs["aria-label"] || "").trim()
    if (!title && !ariaLabel) {
      missing.push(`[${missing.length + 1}] src="${attribs.src || "(no src)"}"`)
    }
  })
  if (missing.length === 0) {
    const evidence = iframes.slice(0, 20).map((el, i) => {
      const a = (el as { attribs?: Record<string, string> }).attribs || {}
      return `[${i + 1}] title="${a.title || a["aria-label"]}" src="${a.src || ""}"`
    })
    return { ...pass("iframe-title", "Iframe Titles", "Accessibility", `${iframes.length} iframe(s) all titled`), evidence }
  }
  return {
    ...fail(
      "iframe-title",
      "Iframe Titles",
      "Accessibility",
      "medium",
      `${missing.length} of ${iframes.length} iframe(s) missing title/aria-label.`,
      "Add a descriptive title attribute on every <iframe> for screen-reader users.",
    ),
    evidence: missing.slice(0, 20),
  }
}

export function checkDuplicateIds($: $Type): CheckResult {
  const counts = new Map<string, number>()
  $("[id]").each((_i, el) => {
    const id = ($(el as never).attr("id") || "").trim()
    if (!id) return
    counts.set(id, (counts.get(id) || 0) + 1)
  })
  const dupes = [...counts.entries()].filter(([, n]) => n > 1)
  if (dupes.length === 0) {
    const sample = [...counts.keys()].slice(0, 20).map((id, i) => `[${i + 1}] #${id}`)
    const evidence = [
      `Total elements scanned with id: ${[...counts.values()].reduce((a, b) => a + b, 0)}`,
      `Unique id values: ${counts.size}`,
      ...(sample.length > 0 ? [`Sample (first ${sample.length}):`, ...sample] : []),
    ]
    return { ...pass("dup-ids", "Duplicate Element IDs", "Accessibility", `${counts.size} unique id(s), no duplicates`), evidence }
  }
  return {
    ...warn(
      "dup-ids",
      "Duplicate Element IDs",
      "Accessibility",
      "medium",
      `${dupes.length} duplicate id(s) detected.`,
      "IDs must be unique per page. Duplicate IDs break label-for, aria-labelledby, and DOM scripting.",
    ),
    evidence: dupes.slice(0, 30).map(([id, n], i) => `[${i + 1}] #${id} appears ${n} times`),
  }
}

// ---------- SECURITY ADDITIONS ----------

export function checkHttpsProtocol(rawUrl: string): CheckResult {
  try {
    const u = new URL(rawUrl)
    if (u.protocol === "https:") {
      return {
        ...pass("https-protocol", "HTTPS Protocol", "Technical", "Served over HTTPS."),
        evidence: [`URL: ${u.toString()}`, `Protocol: ${u.protocol}`, `Host: ${u.host}`],
      }
    }
    return fail(
      "https-protocol",
      "HTTPS Protocol",
      "Technical",
      "critical",
      `Page is served over ${u.protocol.replace(":", "").toUpperCase()}.`,
      "Serve all pages over HTTPS and redirect HTTP to HTTPS at the edge.",
    )
  } catch {
    return info("https-protocol", "HTTPS Protocol", "Technical", "Could not parse URL.")
  }
}

export function checkMixedContent($: $Type, pageUrl: string): CheckResult {
  let isHttps = false
  try {
    isHttps = new URL(pageUrl).protocol === "https:"
  } catch {
    // ignore
  }
  if (!isHttps) {
    return info("mixed-content", "Mixed Content (HTTP on HTTPS)", "Technical", "Page is not HTTPS; mixed-content check skipped.")
  }
  const offenders: string[] = []
  const collect = (selector: string, attr: string, kind: string) => {
    $(selector).each((_i, el) => {
      const v = ($(el as never).attr(attr) || "").trim()
      if (/^http:\/\//i.test(v)) {
        offenders.push(`[${offenders.length + 1}] <${kind}> ${attr}="${v}"`)
      }
    })
  }
  collect("script[src]", "src", "script")
  collect("link[href]", "href", "link")
  collect("img[src]", "src", "img")
  collect("iframe[src]", "src", "iframe")
  collect("video[src], audio[src], source[src]", "src", "media")
  if (offenders.length === 0) {
    const scriptCount = $("script[src]").length
    const linkCount = $("link[href]").length
    const imgCount = $("img[src]").length
    const iframeCount = $("iframe[src]").length
    return {
      ...pass("mixed-content", "Mixed Content (HTTP on HTTPS)", "Technical", "No HTTP subresources on HTTPS page."),
      evidence: [
        `Subresources scanned: scripts=${scriptCount}, links=${linkCount}, images=${imgCount}, iframes=${iframeCount}`,
        `All resources use https:// or protocol-relative URLs.`,
      ],
    }
  }
  return {
    ...fail(
      "mixed-content",
      "Mixed Content (HTTP on HTTPS)",
      "Technical",
      "high",
      `${offenders.length} HTTP subresource(s) on HTTPS page.`,
      "Update every src/href to https:// (or protocol-relative). Browsers block HTTP scripts/styles on HTTPS pages.",
    ),
    evidence: offenders.slice(0, 30),
  }
}

export function checkInlineEventHandlers($: $Type): CheckResult {
  const handlers: string[] = []
  const HANDLER_RE = /^on[a-z]+$/i
  $("*").each((_i, el) => {
    const attribs = (el as { attribs?: Record<string, string> }).attribs || {}
    Object.keys(attribs).forEach((k) => {
      if (HANDLER_RE.test(k)) {
        const tag = (el as { name?: string }).name || "el"
        handlers.push(`[${handlers.length + 1}] <${tag} ${k}="${(attribs[k] || "").slice(0, 80)}">`)
      }
    })
  })
  if (handlers.length === 0) {
    return {
      ...pass("inline-handlers", "Inline Event Handlers", "Technical", "No inline on* event handlers found."),
      evidence: [
        `Scanned all elements for attributes matching on[a-z]+ (onclick, onload, onmouseover, etc.)`,
        `0 inline handler attributes detected — page is CSP-friendly in this respect.`,
      ],
    }
  }
  return {
    ...warn(
      "inline-handlers",
      "Inline Event Handlers",
      "Technical",
      "medium",
      `${handlers.length} inline event handler attribute(s) found.`,
      "Move JavaScript out of HTML attributes. Inline handlers block strict CSP and complicate maintenance.",
    ),
    evidence: handlers.slice(0, 30),
  }
}

export function checkSecurityHeaders(headers: Record<string, string>): CheckResult {
  const expected: { key: string; label: string }[] = [
    { key: "strict-transport-security", label: "Strict-Transport-Security" },
    { key: "content-security-policy", label: "Content-Security-Policy" },
    { key: "x-content-type-options", label: "X-Content-Type-Options" },
    { key: "x-frame-options", label: "X-Frame-Options" },
    { key: "referrer-policy", label: "Referrer-Policy" },
    { key: "permissions-policy", label: "Permissions-Policy" },
  ]
  const present = expected.filter((e) => headers[e.key])
  const missing = expected.filter((e) => !headers[e.key])
  const evidence = expected.map(
    (e, i) => `[${i + 1}] ${e.label}: ${headers[e.key] ? headers[e.key].slice(0, 200) : "(missing)"}`,
  )
  if (missing.length === 0) {
    return { ...pass("sec-headers", "Security Response Headers", "Technical", "All recommended security headers present."), evidence }
  }
  return {
    ...warn(
      "sec-headers",
      "Security Response Headers",
      "Technical",
      missing.some((m) => ["content-security-policy", "strict-transport-security"].includes(m.key)) ? "high" : "medium",
      `${missing.length} of ${expected.length} recommended security headers missing.`,
      "Configure CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy at the CDN/edge.",
    ),
    details: `Present: ${present.map((p) => p.label).join(", ") || "none"}. Missing: ${missing.map((m) => m.label).join(", ")}.`,
    evidence,
  }
}

// ---------- SEO ADDITIONS ----------

export function checkStructuredData($: $Type): CheckResult {
  const ldNodes = $('script[type="application/ld+json"]').toArray()
  const microdata = $("[itemscope]").length
  if (ldNodes.length === 0 && microdata === 0) {
    return warn(
      "structured-data",
      "Structured Data (JSON-LD)",
      "SEO",
      "medium",
      "No JSON-LD or microdata structured data found.",
      "Add JSON-LD (Article, Organization, BreadcrumbList, etc.) to improve rich-result eligibility.",
    )
  }
  const types: string[] = []
  ldNodes.forEach((el, i) => {
    const raw = $(el as never).html() || ""
    try {
      const parsed = JSON.parse(raw)
      const list = Array.isArray(parsed) ? parsed : [parsed]
      list.forEach((p: unknown) => {
        const t = (p as { ["@type"]?: unknown })["@type"]
        if (typeof t === "string") types.push(t)
        else if (Array.isArray(t)) types.push(...t.filter((x): x is string => typeof x === "string"))
      })
    } catch {
      types.push(`[${i + 1}] (invalid JSON-LD)`)
    }
  })
  return {
    ...pass(
      "structured-data",
      "Structured Data (JSON-LD)",
      "SEO",
      `${ldNodes.length} JSON-LD block(s)${microdata ? ` + ${microdata} microdata node(s)` : ""}`,
    ),
    evidence: types.length ? types.map((t, i) => `[${i + 1}] @type: ${t}`) : undefined,
  }
}

export function checkHreflang($: $Type): CheckResult {
  const tags = $('link[rel="alternate"][hreflang]').toArray()
  if (tags.length === 0) {
    // Provide evidence of what WAS searched for so users can verify
    const allAlternates = $('link[rel="alternate"]').toArray()
    const evidence: string[] = [
      `Searched: <link rel="alternate" hreflang="..."> in <head>`,
      `Found 0 hreflang-tagged alternate links.`,
    ]
    if (allAlternates.length > 0) {
      evidence.push(`(${allAlternates.length} other <link rel="alternate"> tag(s) exist without hreflang — typically RSS/JSON feeds)`)
      allAlternates.slice(0, 10).forEach((el, i) => {
        const a = (el as { attribs?: Record<string, string> }).attribs || {}
        evidence.push(`  [${i + 1}] type="${a.type || ""}" href="${a.href || ""}"`)
      })
    }
    return {
      ...info(
        "hreflang",
        "hreflang Alternate Links",
        "SEO",
        "No hreflang alternates found (only required for multi-locale sites).",
      ),
      evidence,
    }
  }
  const evidence = tags.map((el, i) => {
    const a = (el as { attribs?: Record<string, string> }).attribs || {}
    return `[${i + 1}] hreflang="${a.hreflang}" → ${a.href}`
  })
  const hasXDefault = tags.some((el) => ((el as { attribs?: Record<string, string> }).attribs?.hreflang || "").toLowerCase() === "x-default")
  if (!hasXDefault) {
    return {
      ...warn(
        "hreflang",
        "hreflang Alternate Links",
        "SEO",
        "low",
        `${tags.length} hreflang link(s) present but no x-default fallback.`,
        'Add <link rel="alternate" hreflang="x-default" href="..."> for users outside the listed locales.',
      ),
      evidence,
    }
  }
  return { ...pass("hreflang", "hreflang Alternate Links", "SEO", `${tags.length} hreflang link(s) with x-default`), evidence }
}

export function checkFavicon($: $Type): CheckResult {
  const icons = $('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').toArray()
  if (icons.length === 0) {
    return warn(
      "favicon",
      "Favicon",
      "SEO",
      "low",
      "No favicon <link> tag found.",
      'Add <link rel="icon" href="/favicon.ico"> and an apple-touch-icon for mobile bookmarks.',
    )
  }
  const evidence = icons.map((el, i) => {
    const a = (el as { attribs?: Record<string, string> }).attribs || {}
    return `[${i + 1}] rel="${a.rel}" sizes="${a.sizes || ""}" → ${a.href}`
  })
  return { ...pass("favicon", "Favicon", "SEO", `${icons.length} icon link(s) declared`), evidence }
}

// ---------- CONTENT ADDITIONS ----------

export function checkWordCount($: $Type): CheckResult {
  const text = $("body").text().replace(/\s+/g, " ").trim()
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0
  const chars = text.length
  const paragraphs = $("p").length
  const sentences = (text.match(/[.!?]+\s/g) || []).length
  const avgWordsPerParagraph = paragraphs > 0 ? Math.round(words / paragraphs) : 0
  const sample = text.slice(0, 240).replace(/\s+/g, " ") + (text.length > 240 ? "…" : "")
  const evidence = [
    `Word count: ${words}`,
    `Character count: ${chars}`,
    `Paragraph count: ${paragraphs}`,
    `Sentence count (approx): ${sentences}`,
    `Avg words per paragraph: ${avgWordsPerParagraph}`,
    `Body text sample: "${sample}"`,
    `Note: header, footer and cookie banners are excluded from this count.`,
  ]
  if (words < 100) {
    return {
      ...warn(
        "word-count",
        "Body Word Count",
        "Content",
        "low",
        `Body contains only ${words} words (thin content).`,
        "Thin pages (under ~300 words) often underperform in search. Confirm this is intentional.",
      ),
      evidence,
    }
  }
  if (words > 4000) {
    return { ...info("word-count", "Body Word Count", "Content", `Body contains ${words} words (long-form).`), evidence }
  }
  return { ...pass("word-count", "Body Word Count", "Content", `Body contains ${words} words.`), evidence }
}

export function checkDuplicateHeadingText(headings: HeadingInfo[]): CheckResult {
  if (headings.length === 0) {
    return info("dup-headings", "Duplicate Heading Text", "Content", "No headings found.")
  }
  const counts = new Map<string, number>()
  headings.forEach((h) => {
    const key = `H${h.level}::${h.text.trim().toLowerCase()}`
    if (!h.text.trim()) return
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  const dupes = [...counts.entries()].filter(([, n]) => n > 1)
  if (dupes.length === 0) {
    const breakdown: Record<number, number> = {}
    headings.forEach((h) => {
      breakdown[h.level] = (breakdown[h.level] || 0) + 1
    })
    const breakdownLines = Object.keys(breakdown)
      .sort()
      .map((lvl) => `  H${lvl}: ${breakdown[Number(lvl)]}`)
    const evidence = [
      `Total headings scanned: ${headings.length}`,
      `By level:`,
      ...breakdownLines,
      `All headings:`,
      ...headings.slice(0, 50).map((h, i) => `  [${i + 1}] <H${h.level}> "${h.text.trim().slice(0, 120)}"`),
    ]
    return { ...pass("dup-headings", "Duplicate Heading Text", "Content", `${headings.length} heading(s), no duplicates`), evidence }
  }
  return {
    ...warn(
      "dup-headings",
      "Duplicate Heading Text",
      "Content",
      "low",
      `${dupes.length} heading(s) with duplicate text within the same level.`,
      "Make heading text unique within a level so screen-reader users can distinguish sections.",
    ),
    evidence: dupes.slice(0, 30).map(([k, n], i) => {
      const [level, ...rest] = k.split("::")
      return `[${i + 1}] <${level}> "${rest.join("::")}" appears ${n} times`
    }),
  }
}

// ---------- ANALYTICS ----------

export function checkAnalyticsTags($: $Type): CheckResult {
  const html = $.html()
  const detected: string[] = []
  const probes: { name: string; re: RegExp }[] = [
    { name: "Google Tag Manager (GTM)", re: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i },
    { name: "Google Analytics 4 (gtag)", re: /gtag\(['"]config['"]|googletagmanager\.com\/gtag\/js|G-[A-Z0-9]{6,}/i },
    { name: "Universal Analytics (UA)", re: /google-analytics\.com\/analytics\.js|UA-\d+-\d+/i },
    { name: "Adobe Launch / DTM", re: /assets\.adobedtm\.com|launch-[A-Z0-9-]+\.min\.js/i },
    { name: "Adobe Analytics (s_code/AppMeasurement)", re: /s_code\.js|AppMeasurement\.js|s\.t\(\)|s\.tl\(/i },
    { name: "Tealium iQ", re: /tags\.tiqcdn\.com|utag\.js/i },
    { name: "Segment", re: /cdn\.segment\.com\/analytics\.js/i },
    { name: "Mixpanel", re: /cdn\.mxpnl\.com\/libs\/mixpanel/i },
    { name: "Amplitude", re: /cdn\.amplitude\.com\/libs\/amplitude/i },
    { name: "Hotjar", re: /static\.hotjar\.com|hjid:/i },
    { name: "Heap", re: /cdn\.heapanalytics\.com/i },
    { name: "Facebook Pixel", re: /connect\.facebook\.net\/.*\/fbevents\.js|fbq\(['"]init['"]/i },
    { name: "LinkedIn Insight", re: /snap\.licdn\.com\/li\.lms-analytics/i },
    { name: "dataLayer", re: /window\.dataLayer\s*=|dataLayer\.push\(/ },
  ]
  probes.forEach((p) => {
    if (p.re.test(html)) detected.push(p.name)
  })
  if (detected.length === 0) {
    return warn(
      "analytics",
      "Analytics Tags",
      "Technical",
      "medium",
      "No common analytics or tag-manager script detected.",
      "Verify GTM / GA4 / Adobe / Tealium / etc. is firing. Missing analytics means no traffic measurement.",
    )
  }
  return {
    ...pass("analytics", "Analytics Tags", "Technical", `${detected.length} analytics tag(s) detected`),
    evidence: detected.map((d, i) => `[${i + 1}] ${d}`),
  }
}

// ---------- PERFORMANCE / SEO HYBRID ----------

export function checkImageLazyLoading($: $Type): CheckResult {
  const imgs = $("img").toArray()
  if (imgs.length === 0) {
    return info("img-lazy", "Image Lazy Loading", "Performance", "No <img> elements on page.")
  }
  const lazy: { src: string }[] = []
  const eager: { src: string }[] = []
  const unset: { src: string }[] = []
  imgs.forEach((el) => {
    const a = (el as { attribs?: Record<string, string> }).attribs || {}
    const loading = (a.loading || "").toLowerCase()
    const src = a.src || a["data-src"] || "(no src)"
    if (loading === "lazy") lazy.push({ src })
    else if (loading === "eager") eager.push({ src })
    else unset.push({ src })
  })
  const evidence = [
    `Total <img>: ${imgs.length}`,
    `  loading="lazy": ${lazy.length}`,
    `  loading="eager": ${eager.length}`,
    `  loading not set: ${unset.length}`,
    ...(unset.length > 0
      ? [
          `Images without loading attribute (first 15):`,
          ...unset.slice(0, 15).map((u, i) => `  [${i + 1}] ${u.src}`),
        ]
      : []),
  ]
  if (imgs.length <= 5) {
    return { ...pass("img-lazy", "Image Lazy Loading", "Performance", `${imgs.length} image(s); lazy-load not critical.`), evidence }
  }
  if (unset.length > 0 && unset.length / imgs.length > 0.5) {
    return {
      ...warn(
        "img-lazy",
        "Image Lazy Loading",
        "Performance",
        "low",
        `${unset.length} of ${imgs.length} image(s) have no loading attribute.`,
        'Add loading="lazy" to below-the-fold images to defer their fetch and improve LCP.',
      ),
      evidence,
    }
  }
  return {
    ...info(
      "img-lazy",
      "Image Lazy Loading",
      "Performance",
      `${imgs.length} image(s) on page (${lazy.length} lazy, ${eager.length} eager, ${unset.length} unset).`,
    ),
    evidence,
  }
}

export function checkRenderBlockingScripts($: $Type): CheckResult {
  const blocking: string[] = []
  $("head script[src]").each((_i, el) => {
    const a = (el as { attribs?: Record<string, string> }).attribs || {}
    if (a.async === undefined && a.defer === undefined && a.type !== "module") {
      blocking.push(`[${blocking.length + 1}] <script src="${a.src}"> (no async/defer)`)
    }
  })
  if (blocking.length === 0) {
    const headScripts = $("head script[src]").toArray()
    const evidence = headScripts.length === 0
      ? [`No <script src> in <head>. All scripts are inline or loaded from <body>.`]
      : [
          `${headScripts.length} <script src> in <head>; all use async/defer/module:`,
          ...headScripts.slice(0, 20).map((el, i) => {
            const a = (el as { attribs?: Record<string, string> }).attribs || {}
            const mode = a.async !== undefined ? "async" : a.defer !== undefined ? "defer" : a.type === "module" ? "module" : "?"
            return `  [${i + 1}] ${mode}: ${a.src}`
          }),
        ]
    return { ...pass("render-blocking", "Render-Blocking Scripts in <head>", "Performance", "All <head> scripts use async/defer/module."), evidence }
  }
  return {
    ...warn(
      "render-blocking",
      "Render-Blocking Scripts in <head>",
      "Performance",
      blocking.length > 5 ? "high" : "medium",
      `${blocking.length} render-blocking script(s) in <head>.`,
      "Add defer or async (or move to end of body / use type=module) to avoid blocking first paint.",
    ),
    evidence: blocking.slice(0, 30),
  }
}

// ---------- FUNCTIONALITY ----------

export function checkBreadcrumbs($: $Type): CheckResult {
  const ld = $('script[type="application/ld+json"]').toArray()
  let ldBreadcrumb = false
  ld.forEach((el) => {
    try {
      const parsed = JSON.parse($(el as never).html() || "")
      const list = Array.isArray(parsed) ? parsed : [parsed]
      list.forEach((p: unknown) => {
        const t = (p as { ["@type"]?: unknown })["@type"]
        if (t === "BreadcrumbList" || (Array.isArray(t) && t.includes("BreadcrumbList"))) ldBreadcrumb = true
      })
    } catch {
      // ignore
    }
  })
  const visualBreadcrumb =
    $('nav[aria-label*="breadcrumb" i]').length > 0 ||
    $('[class*="breadcrumb" i]').length > 0 ||
    $('ol[itemtype*="BreadcrumbList" i]').length > 0
  if (!ldBreadcrumb && !visualBreadcrumb) {
    return info(
      "breadcrumbs",
      "Breadcrumbs",
      "Functionality",
      "No breadcrumbs detected (visual or JSON-LD).",
    )
  }
  const bits: string[] = []
  const evidence: string[] = []
  if (visualBreadcrumb) {
    bits.push("visual breadcrumb element")
    $('nav[aria-label*="breadcrumb" i], [class*="breadcrumb" i], ol[itemtype*="BreadcrumbList" i]')
      .slice(0, 5)
      .each((i, el) => {
        const a = (el as { attribs?: Record<string, string> }).attribs || {}
        const tag = (el as { name?: string }).name || "el"
        const text = $(el as never).text().trim().replace(/\s+/g, " ").slice(0, 120)
        evidence.push(`[V${i + 1}] <${tag}${a["aria-label"] ? ` aria-label="${a["aria-label"]}"` : ""}${a.class ? ` class="${a.class}"` : ""}> "${text}"`)
      })
  }
  if (ldBreadcrumb) {
    bits.push("BreadcrumbList JSON-LD")
    evidence.push(`[JSON-LD] @type=BreadcrumbList present`)
  }
  return { ...pass("breadcrumbs", "Breadcrumbs", "Functionality", bits.join(" + ")), evidence }
}

export const ManualCheckIds = new Set(["figma", "cross-browser"])
