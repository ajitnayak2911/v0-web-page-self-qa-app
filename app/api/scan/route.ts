import { NextResponse } from "next/server"
import { runScan } from "@/lib/scanner"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { url, validateLinks: vl = true, username, password } = await req.json()
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }
    const normalized = url.match(/^https?:\/\//i) ? url : `https://${url}`
    const report = await runScan(normalized, {
      validateLinks: vl,
      username: typeof username === "string" && username.trim() ? username.trim() : undefined,
      password: typeof password === "string" && password.trim() ? password.trim() : undefined,
    })
    return NextResponse.json({ report })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Scan failed" }, { status: 500 })
  }
}
