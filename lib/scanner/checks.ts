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
  const form = $("form").length
  const dl = $('a[href$=".pdf"], a[download]').length
  if (form > 0 && dl > 0)
    return pass("gated-form", "Gated Form Download CTA", "Functionality", `${form} form(s) and ${dl} download(s) detected`)
  return info("gated-form", "Gated Form Download CTA", "Functionality", "No gated download pattern detected.")
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

export const ManualCheckIds = new Set(["figma", "cross-browser"])
