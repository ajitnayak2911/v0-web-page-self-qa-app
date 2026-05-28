import { NextResponse } from "next/server"
import { runScan } from "@/lib/scanner"

export const runtime = "nodejs"
// Headless form submission can take 20-40s; give the route plenty of headroom.
export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const { url, validateLinks: vl = true, username, password, submitForms } = await req.json()
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }
    const normalized = url.match(/^https?:\/\//i) ? url : `https://${url}`
    const report = await runScan(normalized, {
      validateLinks: vl,
      username: typeof username === "string" && username.trim() ? username.trim() : undefined,
      password: typeof password === "string" && password.trim() ? password.trim() : undefined,
      submitForms: !!submitForms,
    })
    return NextResponse.json({ report })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Scan failed" }, { status: 500 })
  }
}
