/**
 * Headless-browser form submission for Deep Scan.
 *
 * Adapted from the user-supplied Python/Playwright reference (gated-form-automation.py).
 * Runs a real Chromium instance (@sparticuz/chromium on Vercel, native otherwise),
 * detects the first contact-like form, fills every input with safe dummy data
 * based on field name/id/label heuristics, clicks submit, and records evidence:
 *  - field-by-field fill plan
 *  - DOM/URL change after submit (success signals)
 *  - any validation error text that appears
 *  - a base64 screenshot (small) of the post-submit state
 *
 * This is opt-in (user must check "Attempt real form submission") because it
 * really posts the form and can create leads in the target system.
 */

import type { Browser, BrowserContext, Page } from "playwright-core"
import type { CheckResult, Severity } from "./types"

export interface FormSubmitOptions {
  url: string
  auth?: { username: string; password: string }
  timeoutMs?: number
  dummy?: Partial<Record<string, string>>
}

interface FilledField {
  selector: string
  label: string
  type: string
  value: string
  strategy: string
}

interface SubmissionResult {
  attempted: boolean
  submitted: boolean
  success: boolean
  startUrl: string
  endUrl: string
  filled: FilledField[]
  skipped: { selector: string; reason: string }[]
  validationErrors: string[]
  successSignals: string[]
  consoleErrors: string[]
  networkPosts: { url: string; method: string; status: number; ok: boolean }[]
  screenshot?: string // base64 png, ~50KB
  durationMs: number
  error?: string
}

// ---------------------------------------------------------------------------
// Dummy data generation
// ---------------------------------------------------------------------------

const DEFAULT_DUMMY = {
  firstName: "Test",
  lastName: "Automation",
  fullName: "Test Automation",
  email: `qa.scanner+${Date.now()}@example.com`,
  phone: "5555550100",
  company: "QA Scanner Test",
  jobTitle: "QA Engineer",
  country: "United States",
  state: "New York",
  city: "New York",
  zip: "10001",
  message: "This is an automated QA scan submission. Please disregard.",
  url: "https://example.com",
}

function pickDummy(field: { name: string; id: string; label: string; type: string; placeholder: string }, overrides?: Partial<Record<string, string>>): { value: string; strategy: string } {
  const d = { ...DEFAULT_DUMMY, ...(overrides || {}) }
  const blob = `${field.name} ${field.id} ${field.label} ${field.placeholder}`.toLowerCase()

  // Email-style fields
  if (field.type === "email" || /\bemail\b|e-mail|mail/.test(blob)) return { value: d.email, strategy: "email" }
  if (field.type === "tel" || /\bphone\b|telephone|mobile|cell/.test(blob)) return { value: d.phone, strategy: "phone" }
  if (field.type === "url" || /\bwebsite\b|\burl\b/.test(blob)) return { value: d.url, strategy: "url" }
  if (field.type === "number") return { value: "1", strategy: "number" }
  if (field.type === "date") return { value: "2026-01-01", strategy: "date" }

  // Name-style
  if (/first.?name|fname|given/.test(blob)) return { value: d.firstName, strategy: "first-name" }
  if (/last.?name|lname|surname|family/.test(blob)) return { value: d.lastName, strategy: "last-name" }
  if (/full.?name|\bname\b/.test(blob)) return { value: d.fullName, strategy: "full-name" }

  // Company / role
  if (/company|organi[sz]ation|employer|business/.test(blob)) return { value: d.company, strategy: "company" }
  if (/job.?title|position|role|designation/.test(blob)) return { value: d.jobTitle, strategy: "job-title" }

  // Address
  if (/country/.test(blob)) return { value: d.country, strategy: "country" }
  if (/state|province|region/.test(blob)) return { value: d.state, strategy: "state" }
  if (/city|town/.test(blob)) return { value: d.city, strategy: "city" }
  if (/\bzip\b|postal/.test(blob)) return { value: d.zip, strategy: "zip" }

  // Message / comment
  if (/message|comment|question|inquiry|enquiry|describe|details/.test(blob))
    return { value: d.message, strategy: "message" }

  // Fallback
  return { value: d.fullName, strategy: "fallback" }
}

// ---------------------------------------------------------------------------
// Browser launcher (works locally and on Vercel)
// ---------------------------------------------------------------------------

async function launchBrowser(): Promise<Browser> {
  const playwright = await import("playwright-core")

  // On Linux (Vercel Lambda OR the v0 sandbox VM) use the bundled chromium
  // from @sparticuz/chromium so we never depend on a system install.
  if (process.platform === "linux") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("@sparticuz/chromium")
    const chromium = mod.default ?? mod
    const executablePath = await chromium.executablePath()
    return playwright.chromium.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--single-process",
      ],
      executablePath,
      headless: true,
    })
  }

  // macOS/Windows dev fallback (developer machine has a browser installed)
  return playwright.chromium.launch({ headless: true })
}

// ---------------------------------------------------------------------------
// Form selection
// ---------------------------------------------------------------------------

const HONEYPOT_HINTS = ["honeypot", "honey-pot", "hp_", "url-trap", "spam-protect"]

const SUCCESS_TEXT_RE =
  /thank you|thank-you|received|submitted|success|we'll be in touch|we will be in touch|on its way|confirmation|appreciate your/i

const ERROR_HINT_SEL =
  '[class*="error" i], [class*="invalid" i], [aria-invalid="true"], [role="alert"], .field-error, .form-error, .help-block.error'

async function pickFormHandle(page: Page) {
  const forms = page.locator("form")
  const count = await forms.count()
  if (count === 0) return null

  let best = -1
  let bestScore = -1
  for (let i = 0; i < count; i++) {
    const f = forms.nth(i)
    const text = (await f.innerText().catch(() => "")) || ""
    const html = (await f.innerHTML().catch(() => "")) || ""
    const blob = `${text} ${html}`.toLowerCase()
    let score = 0
    if (/email|e-mail/.test(blob)) score += 3
    if (/contact|message|inquiry|enquiry/.test(blob)) score += 2
    if (/first.?name|last.?name|full.?name|name=/.test(blob)) score += 1
    if (/phone|telephone/.test(blob)) score += 1
    if (/company|organi[sz]ation/.test(blob)) score += 1
    // Penalize search / login / newsletter-only forms
    if (/^search$|role="search"|search\?q=/.test(blob)) score -= 5
    if (/login|sign in|password/.test(blob)) score -= 5
    if (/subscribe|newsletter/.test(blob) && !/contact|message/.test(blob)) score -= 2
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  if (best < 0 || bestScore <= 0) return null
  return forms.nth(best)
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function attemptFormSubmission(opts: FormSubmitOptions): Promise<SubmissionResult> {
  const startedAt = Date.now()
  const timeout = opts.timeoutMs ?? 25000
  const result: SubmissionResult = {
    attempted: false,
    submitted: false,
    success: false,
    startUrl: opts.url,
    endUrl: opts.url,
    filled: [],
    skipped: [],
    validationErrors: [],
    successSignals: [],
    consoleErrors: [],
    networkPosts: [],
    durationMs: 0,
  }

  let browser: Browser | null = null
  let ctx: BrowserContext | null = null
  try {
    browser = await launchBrowser()
    ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      httpCredentials: opts.auth,
      viewport: { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (compatible; QA-Scanner-DeepScan/1.0; +https://qa-scanner.local)",
    })

    const page = await ctx.newPage()
    page.on("console", (msg) => {
      if (msg.type() === "error") result.consoleErrors.push(msg.text().slice(0, 200))
    })
    page.on("response", (res) => {
      const req = res.request()
      if (req.method() === "POST") {
        result.networkPosts.push({
          url: res.url(),
          method: req.method(),
          status: res.status(),
          ok: res.ok(),
        })
      }
    })

    await page.goto(opts.url, { waitUntil: "domcontentloaded", timeout })

    // Dismiss obvious cookie/consent banners (best-effort)
    const consentSelectors = [
      'button:has-text("Accept all")',
      'button:has-text("Accept All")',
      'button:has-text("Accept")',
      'button:has-text("I agree")',
      "#onetrust-accept-btn-handler",
    ]
    for (const sel of consentSelectors) {
      try {
        const btn = page.locator(sel).first()
        if (await btn.isVisible({ timeout: 500 })) {
          await btn.click({ timeout: 1500 })
          await page.waitForTimeout(300)
          break
        }
      } catch {
        // ignore
      }
    }

    const form = await pickFormHandle(page)
    if (!form) {
      result.error = "No contact-like form detected on the page."
      return result
    }

    try {
      await form.scrollIntoViewIfNeeded({ timeout: 2000 })
    } catch {
      // ignore
    }

    result.attempted = true

    // ---- Fill every fillable input ----
    const inputs = form.locator(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea',
    )
    const n = await inputs.count()
    for (let i = 0; i < n; i++) {
      const el = inputs.nth(i)
      const tag = (await el.evaluate((e) => e.tagName.toLowerCase()).catch(() => "input")) as string
      const type = ((await el.getAttribute("type").catch(() => "")) || "text").toLowerCase()
      const name = (await el.getAttribute("name").catch(() => "")) || ""
      const id = (await el.getAttribute("id").catch(() => "")) || ""
      const placeholder = (await el.getAttribute("placeholder").catch(() => "")) || ""
      const ariaLabel = (await el.getAttribute("aria-label").catch(() => "")) || ""
      let label = ariaLabel
      if (!label && id) {
        label = (await page.locator(`label[for="${CSS.escape(id)}"]`).first().innerText().catch(() => "")) || ""
      }
      const selector = id ? `#${id}` : name ? `[name="${name}"]` : `${tag}[type="${type}"] (#${i + 1})`

      // Skip honeypots
      const isHidden = await el.evaluate((e) => {
        const s = window.getComputedStyle(e as HTMLElement)
        return s.display === "none" || s.visibility === "hidden" || (e as HTMLElement).offsetParent === null
      }).catch(() => false)
      const honeypot = HONEYPOT_HINTS.some((h) => `${name} ${id}`.toLowerCase().includes(h))
      if (isHidden || honeypot) {
        result.skipped.push({ selector, reason: honeypot ? "honeypot" : "hidden" })
        continue
      }

      try {
        if (tag === "select") {
          // Pick the first non-empty option
          const value = await el.evaluate((sel) => {
            const s = sel as HTMLSelectElement
            for (const o of Array.from(s.options)) {
              if (o.value && !o.disabled) return o.value
            }
            return ""
          })
          if (value) {
            await el.selectOption(value, { timeout: 2000 })
            result.filled.push({ selector, label, type: "select", value, strategy: "first-option" })
          } else {
            result.skipped.push({ selector, reason: "select with no options" })
          }
        } else if (type === "checkbox") {
          // Tick consent / agreement / opt-in style checkboxes
          if (/agree|consent|terms|privacy|opt.?in|gdpr|policy/i.test(`${name} ${id} ${label}`)) {
            await el.check({ timeout: 2000 }).catch(() => {})
            result.filled.push({ selector, label, type: "checkbox", value: "checked", strategy: "consent" })
          } else {
            result.skipped.push({ selector, reason: "non-consent checkbox" })
          }
        } else if (type === "radio") {
          // Pick the first radio in this group
          const groupName = name
          if (groupName) {
            const first = form.locator(`input[type="radio"][name="${groupName}"]`).first()
            await first.check({ timeout: 2000 }).catch(() => {})
            result.filled.push({ selector: `[name="${groupName}"]`, label, type: "radio", value: "first-option", strategy: "radio-first" })
          }
        } else {
          const { value, strategy } = pickDummy({ name, id, label, type, placeholder }, opts.dummy)
          await el.fill(value, { timeout: 2000 })
          result.filled.push({ selector, label, type, value, strategy })
        }
      } catch (err) {
        result.skipped.push({ selector, reason: `fill failed: ${(err as Error).message.slice(0, 80)}` })
      }
    }

    // De-duplicate filled radios
    const seenRadio = new Set<string>()
    result.filled = result.filled.filter((f) => {
      if (f.type !== "radio") return true
      if (seenRadio.has(f.selector)) return false
      seenRadio.add(f.selector)
      return true
    })

    // ---- Submit ----
    const submitBtn = form
      .locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Send")')
      .first()
    const startUrl = page.url()
    result.startUrl = startUrl

    if ((await submitBtn.count()) === 0) {
      result.error = "Form has no submit button."
      return result
    }

    await Promise.allSettled([
      page.waitForLoadState("networkidle", { timeout: timeout }).catch(() => {}),
      submitBtn.click({ timeout: 5000 }),
    ])
    result.submitted = true

    // Give SPAs a moment to update the DOM
    await page.waitForTimeout(1500)

    result.endUrl = page.url()

    // ---- Detect success / errors ----
    if (result.endUrl !== startUrl) {
      result.successSignals.push(`URL changed: ${startUrl} → ${result.endUrl}`)
    }
    if (/thank|success|received|confirmation|submitted/i.test(result.endUrl)) {
      result.successSignals.push(`URL contains success keyword: ${result.endUrl}`)
    }

    const bodyText = await page.locator("body").innerText().catch(() => "")
    const m = bodyText.match(SUCCESS_TEXT_RE)
    if (m) result.successSignals.push(`Success text in body: "${m[0]}"`)

    // Validation errors (only if no success)
    if (result.successSignals.length === 0) {
      const errLocs = page.locator(ERROR_HINT_SEL)
      const errCount = Math.min(await errLocs.count().catch(() => 0), 10)
      for (let i = 0; i < errCount; i++) {
        const txt = (await errLocs.nth(i).innerText().catch(() => "")).trim().replace(/\s+/g, " ")
        if (txt && !result.validationErrors.includes(txt)) result.validationErrors.push(txt.slice(0, 200))
      }
    }

    // Successful network POST is also a signal
    const okPost = result.networkPosts.find((p) => p.ok)
    if (okPost) result.successSignals.push(`POST ${okPost.url} → ${okPost.status}`)

    result.success = result.successSignals.length > 0 && result.validationErrors.length === 0

    // Capture a small screenshot for evidence
    try {
      const buf = await page.screenshot({ type: "png", fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 720 } })
      // Compress by limiting to first ~120KB to keep payload small
      result.screenshot = `data:image/png;base64,${buf.toString("base64").slice(0, 160_000)}`
    } catch {
      // ignore
    }

    return result
  } catch (e) {
    result.error = (e as Error).message
    return result
  } finally {
    try {
      await ctx?.close()
    } catch {
      // ignore
    }
    try {
      await browser?.close()
    } catch {
      // ignore
    }
    result.durationMs = Date.now() - startedAt
  }
}

// ---------------------------------------------------------------------------
// Convert SubmissionResult to one or two CheckResult entries
// ---------------------------------------------------------------------------

export function submissionResultToChecks(r: SubmissionResult): CheckResult[] {
  const out: CheckResult[] = []

  const baseEvidence: string[] = [
    `Start URL : ${r.startUrl}`,
    `End URL   : ${r.endUrl}`,
    `Duration  : ${r.durationMs} ms`,
    "",
    `--- Filled fields (${r.filled.length}) ---`,
    ...r.filled.map(
      (f, i) =>
        `[${i + 1}] ${f.selector}  label="${f.label || "(none)"}"  type=${f.type}  strategy=${f.strategy}  → "${f.value}"`,
    ),
  ]
  if (r.skipped.length > 0) {
    baseEvidence.push("", `--- Skipped fields (${r.skipped.length}) ---`, ...r.skipped.map((s, i) => `[${i + 1}] ${s.selector}  (${s.reason})`))
  }
  if (r.networkPosts.length > 0) {
    baseEvidence.push("", `--- POST requests during submit (${r.networkPosts.length}) ---`, ...r.networkPosts.map((p, i) => `[${i + 1}] ${p.status} ${p.method} ${p.url}`))
  }
  if (r.successSignals.length > 0) {
    baseEvidence.push("", `--- Success signals (${r.successSignals.length}) ---`, ...r.successSignals.map((s, i) => `[${i + 1}] ${s}`))
  }
  if (r.validationErrors.length > 0) {
    baseEvidence.push("", `--- Validation errors detected (${r.validationErrors.length}) ---`, ...r.validationErrors.map((s, i) => `[${i + 1}] ${s}`))
  }
  if (r.consoleErrors.length > 0) {
    baseEvidence.push("", `--- Browser console errors (${r.consoleErrors.length}) ---`, ...r.consoleErrors.slice(0, 5).map((s, i) => `[${i + 1}] ${s}`))
  }
  if (r.screenshot) {
    baseEvidence.push("", `Post-submit screenshot captured (base64 png, ${Math.round(r.screenshot.length / 1024)} KB). Open the Excel evidence sheet or paste the data URL into a browser to view.`)
  }

  let status: CheckResult["status"]
  let severity: Severity
  let message: string
  let recommendation: string | undefined

  if (!r.attempted) {
    status = "info"
    severity = "info"
    message = r.error || "No contact-like form detected on the page."
  } else if (!r.submitted) {
    status = "warn"
    severity = "medium"
    message = r.error || "Form was filled but could not be submitted (no submit button or click intercepted)."
    recommendation = "Verify the submit button is visible and clickable, or run the flow manually."
  } else if (r.success) {
    status = "pass"
    severity = "info"
    message = `Form submitted successfully (${r.filled.length} field(s) filled, ${r.successSignals.length} success signal(s)).`
  } else if (r.validationErrors.length > 0) {
    status = "fail"
    severity = "high"
    message = `Form submission produced ${r.validationErrors.length} validation error(s) — dummy data was rejected.`
    recommendation = "Review the listed validation errors. Update the dummy-data heuristics for any custom field types."
  } else {
    status = "warn"
    severity = "medium"
    message = "Form was submitted but no clear success signal detected (no URL change, no thank-you text)."
    recommendation = "Confirm the form actually submitted to the backend and add a visible confirmation message for users."
  }

  out.push({
    id: "contact-form-submit",
    name: "Contact Form Auto-Submit (Deep Scan)",
    category: "Functionality",
    status,
    severity,
    message,
    suggestion: recommendation,
    evidence: baseEvidence,
  })

  return out
}
