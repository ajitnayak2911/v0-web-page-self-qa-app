import type { LinkInfo } from "./types"

export function classifyLink(href: string, baseUrl: URL): LinkInfo["type"] {
  const trimmed = href.trim()
  if (!trimmed) return "other"
  if (trimmed.startsWith("#")) return "anchor"
  if (trimmed.startsWith("mailto:")) return "mailto"
  if (trimmed.startsWith("tel:")) return "tel"
  try {
    const u = new URL(trimmed, baseUrl)
    if (u.pathname.toLowerCase().endsWith(".pdf")) return "pdf"
    if (u.hostname === baseUrl.hostname) return "internal"
    return "external"
  } catch {
    return "other"
  }
}

export function resolveHref(href: string, baseUrl: URL): string {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return href
  }
}

async function checkOne(link: LinkInfo, timeoutMs = 8000): Promise<LinkInfo> {
  if (link.type === "anchor" || link.type === "mailto" || link.type === "tel") {
    return { ...link, ok: true, status: 0, statusText: "skipped" }
  }
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), timeoutMs)
    let res: Response
    try {
      res = await fetch(link.href, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "QA-Scanner/1.0 (+https://qa-scanner.local)" },
      })
      // Some servers don't support HEAD; retry GET on 405/403
      if (res.status === 405 || res.status === 403 || res.status === 501) {
        res = await fetch(link.href, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "QA-Scanner/1.0" },
        })
      }
    } finally {
      clearTimeout(t)
    }
    return {
      ...link,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      redirected: res.redirected,
      finalUrl: res.url,
    }
  } catch (e: any) {
    return {
      ...link,
      ok: false,
      error: e?.name === "AbortError" ? "Timeout" : e?.message || "Network error",
    }
  }
}

export async function validateLinks(links: LinkInfo[], concurrency = 8): Promise<LinkInfo[]> {
  const results: LinkInfo[] = new Array(links.length)
  let i = 0
  async function worker() {
    while (i < links.length) {
      const idx = i++
      results[idx] = await checkOne(links[idx])
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, links.length) }, () => worker())
  await Promise.all(workers)
  return results
}
