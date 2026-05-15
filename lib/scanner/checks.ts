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
  const hasH2 = headings.some((h) => h.level === 2)
  if (hasH2) return pass("main-subheading", "Main Subheading", "Content", "H2 subheading present")
  return warn("main-subheading", "Main Subheading", "Content", "low", "No H2 subheading found")
}

export function checkBodySubheadings(headings: HeadingInfo[]): CheckResult {
  const subs = headings.filter((h) => h.level >= 3).length
  if (subs > 0) return pass("body-subheadings", "Body Subheadings", "Content", `${subs} sub-headings found`)
  return info("body-subheadings", "Body Subheadings", "Content", "No H3+ subheadings on page.")
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
  const len = url.length
  if (len > 100)
    return warn("url-length", "URL Length", "SEO", "low", `URL is long (${len} chars)`, "Aim for under 100 characters.")
  return pass("url-length", "URL Length", "SEO", `URL length ${len} chars`)
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
  if (broken.length === 0) return pass("broken-links", "Broken Links", "Links", "No broken links detected")
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
  if (redirects.length === 0) return pass("redirects", "Redirect Links", "Links", "No redirected links")
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
    return pass("ext-new-tab", "External Links Open in New Tab", "Functionality", `${ext.length} external links — all open in new tab`)
  return warn(
    "ext-new-tab",
    "External Links Open in New Tab",
    "Functionality",
    "medium",
    `${bad.length}/${ext.length} external links missing target="_blank"`,
    'Add target="_blank" rel="noopener noreferrer" to external links.',
    undefined,
    bad.slice(0, 10).map((l) => l.href),
  )
}

export function checkInternalSameTab(links: LinkInfo[]): CheckResult {
  const internal = links.filter((l) => l.type === "internal")
  const bad = internal.filter((l) => l.target === "_blank")
  if (internal.length === 0) return info("int-same-tab", "Internal Links Open in Same Tab", "Functionality", "No internal links found.")
  if (bad.length === 0)
    return pass("int-same-tab", "Internal Links Open in Same Tab", "Functionality", `${internal.length} internal links — all open in same tab`)
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
    return pass("pdf-new-tab", "PDFs Open in New Tab", "Functionality", `${pdfs.length} PDF link(s) — all open in new tab`)
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
    return pass("rel-security", "External Link Security (rel)", "Technical", "All external _blank links have proper rel attributes")
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
    return pass("img-alt", "Image Alt Text", "Accessibility", `All ${images.length} images have alt attributes`)
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

export function checkTrademarkSuperscript(html: string): CheckResult {
  // Find ™ or ® not inside <sup>
  const stripped = html.replace(/<sup[\s\S]*?<\/sup>/gi, "")
  const tmCount = (stripped.match(/[™®]/g) || []).length
  if (tmCount === 0) return info("trademark", "Trademark Superscript", "Content", "No ™/® symbols outside <sup> found.")
  return warn(
    "trademark",
    "Trademark Superscript",
    "Content",
    "low",
    `${tmCount} trademark symbol(s) not wrapped in <sup>`,
    "Wrap ™ and ® in <sup> for proper typography.",
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
  const eyebrow = $('[class*="eyebrow" i]').first().text().trim()
  if (!eyebrow) return info("eyebrow", "Eyebrow Text", "Content", "No eyebrow text component detected.")
  return pass("eyebrow", "Eyebrow Text", "Content", "Eyebrow text present", eyebrow)
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
  return pass("cta", "CTA Text", "Content", `${ctas.length} CTA(s) reviewed`)
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
  const filters = $('[class*="filter" i] select, [class*="filter" i] button, [data-filter]').length
  if (filters === 0) return info("insights-filter", "Insights Hub Filter", "Functionality", "No filter UI detected.")
  return pass("insights-filter", "Insights Hub Filter", "Functionality", `${filters} filter control(s) detected (manual test recommended)`)
}

export function checkGatedFormDownload($: $Type): CheckResult {
  const form = $("form").length
  const dl = $('a[href$=".pdf"], a[download]').length
  if (form > 0 && dl > 0)
    return pass("gated-form", "Gated Form Download CTA", "Functionality", `${form} form(s) and ${dl} download(s) detected`)
  return info("gated-form", "Gated Form Download CTA", "Functionality", "No gated download pattern detected.")
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
