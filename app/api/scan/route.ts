import { NextResponse } from "next/server"
import { runScan } from "@/lib/scanner"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { url, validateLinks: vl = true } = await req.json()
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }
    const normalized = url.match(/^https?:\/\//i) ? url : `https://${url}`
    const report = await runScan(normalized, { validateLinks: vl })
    return NextResponse.json({ report })
  } catch (e: any) {
    console.log("[v0] scan error:", e?.message)
    return NextResponse.json({ error: e?.message || "Scan failed" }, { status: 500 })
  }
}
