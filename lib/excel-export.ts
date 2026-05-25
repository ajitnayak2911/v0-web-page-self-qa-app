"use client"

import ExcelJS from "exceljs"
import type { ScanReport, CheckResult } from "@/lib/scanner/types"

// Argb colors (FFRRGGBB) used throughout the workbook
const COLORS = {
  passBg: "FFD1FAE5",
  passText: "FF065F46",
  warnBg: "FFFEF3C7",
  warnText: "FF92400E",
  failBg: "FFFEE2E2",
  failText: "FF991B1B",
  infoBg: "FFE5E7EB",
  infoText: "FF374151",
  headerBg: "FF0F172A",
  headerText: "FFFFFFFF",
  bandBg: "FFF8FAFC",
  border: "FFCBD5E1",
  // pie slices
  passPie: "#10B981",
  warnPie: "#F59E0B",
  failPie: "#EF4444",
  infoPie: "#94A3B8",
}

function statusStyle(status: CheckResult["status"]) {
  switch (status) {
    case "pass":
      return { bg: COLORS.passBg, text: COLORS.passText }
    case "warn":
      return { bg: COLORS.warnBg, text: COLORS.warnText }
    case "fail":
      return { bg: COLORS.failBg, text: COLORS.failText }
    default:
      return { bg: COLORS.infoBg, text: COLORS.infoText }
  }
}

function severityStyle(severity: CheckResult["severity"]) {
  switch (severity) {
    case "critical":
    case "high":
      return { bg: COLORS.failBg, text: COLORS.failText }
    case "medium":
      return { bg: COLORS.warnBg, text: COLORS.warnText }
    case "low":
      return { bg: COLORS.infoBg, text: COLORS.infoText }
    default:
      return { bg: COLORS.infoBg, text: COLORS.infoText }
  }
}

function applyHeaderRow(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: false }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
    cell.font = { color: { argb: COLORS.headerText }, bold: true, size: 11 }
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
    cell.border = {
      top: { style: "thin", color: { argb: COLORS.border } },
      left: { style: "thin", color: { argb: COLORS.border } },
      right: { style: "thin", color: { argb: COLORS.border } },
      bottom: { style: "thin", color: { argb: COLORS.border } },
    }
  })
  row.height = 22
}

function thinBorders(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "hair", color: { argb: COLORS.border } },
    left: { style: "hair", color: { argb: COLORS.border } },
    right: { style: "hair", color: { argb: COLORS.border } },
    bottom: { style: "hair", color: { argb: COLORS.border } },
  }
}

// Render a pie chart to a PNG dataURL using an offscreen canvas
function renderPieChartPng(
  counts: { label: string; value: number; color: string }[],
  size = 480,
): string | null {
  if (typeof document === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, size, size)

  const total = counts.reduce((a, b) => a + b.value, 0)
  const cx = size / 2
  const cy = size / 2 - 20
  const r = size / 2 - 90

  if (total === 0) {
    ctx.fillStyle = "#94A3B8"
    ctx.font = "16px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("No data", cx, cy)
    return canvas.toDataURL("image/png")
  }

  // Slices
  let start = -Math.PI / 2
  counts.forEach((slice) => {
    if (slice.value <= 0) return
    const angle = (slice.value / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, start, start + angle)
    ctx.closePath()
    ctx.fillStyle = slice.color
    ctx.fill()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.stroke()

    // Percent label
    const mid = start + angle / 2
    const lx = cx + Math.cos(mid) * r * 0.65
    const ly = cy + Math.sin(mid) * r * 0.65
    const pct = Math.round((slice.value / total) * 100)
    if (pct >= 5) {
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 16px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(`${pct}%`, lx, ly)
    }
    start += angle
  })

  // Title
  ctx.fillStyle = "#0F172A"
  ctx.font = "bold 18px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "alphabetic"
  ctx.fillText("Check Results Distribution", cx, 28)

  // Legend
  const legendY = size - 70
  const swatch = 14
  const gap = 14
  const items = counts.map((c) => `${c.label}: ${c.value}`)
  ctx.font = "13px sans-serif"
  const widths = items.map((t) => ctx.measureText(t).width + swatch + 6 + gap)
  const totalWidth = widths.reduce((a, b) => a + b, 0) - gap
  let lx = (size - totalWidth) / 2
  counts.forEach((c, i) => {
    ctx.fillStyle = c.color
    ctx.fillRect(lx, legendY, swatch, swatch)
    ctx.strokeStyle = "#0F172A"
    ctx.lineWidth = 1
    ctx.strokeRect(lx, legendY, swatch, swatch)
    ctx.fillStyle = "#0F172A"
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(items[i], lx + swatch + 6, legendY + swatch / 2)
    lx += widths[i]
  })

  return canvas.toDataURL("image/png")
}

function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",")
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

export async function exportReportToExcel(report: ScanReport) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Page Quality Checker"
  wb.created = new Date()

  // ---------- SUMMARY SHEET ----------
  const summary = wb.addWorksheet("Summary", {
    properties: { defaultColWidth: 22 },
    views: [{ showGridLines: false }],
  })

  summary.mergeCells("A1:D1")
  const title = summary.getCell("A1")
  title.value = "Page Quality Scan Report"
  title.font = { size: 18, bold: true, color: { argb: COLORS.headerText } }
  title.alignment = { vertical: "middle", horizontal: "left" }
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
  summary.getRow(1).height = 36

  const metaRows: [string, string][] = [
    ["URL", report.meta.url],
    ["Final URL", report.meta.finalUrl],
    ["Scanned At", report.meta.scannedAt],
    ["HTTP Status", String(report.meta.httpStatus)],
    ["Redirected", report.meta.redirected ? "Yes" : "No"],
    ["Content Type", report.meta.contentType || "—"],
    ["Page Size (bytes)", String(report.meta.pageSizeBytes)],
    ["Fetch Time (ms)", String(report.meta.fetchTimeMs)],
    ["Scan Duration (ms)", String(report.meta.durationMs)],
    ["Title", report.meta.title || "—"],
    ["Description", report.meta.description || "—"],
  ]
  metaRows.forEach((r, i) => {
    const row = summary.getRow(3 + i)
    row.getCell(1).value = r[0]
    row.getCell(1).font = { bold: true, color: { argb: "FF334155" } }
    row.getCell(1).alignment = { vertical: "top" }
    summary.mergeCells(3 + i, 2, 3 + i, 4)
    row.getCell(2).value = r[1]
    row.getCell(2).alignment = { vertical: "top", wrapText: true }
    row.height = Math.max(18, Math.min(60, 18 + Math.floor((r[1]?.length || 0) / 60) * 14))
  })

  // Score block
  const scoreRowStart = 3 + metaRows.length + 1
  summary.mergeCells(scoreRowStart, 1, scoreRowStart, 4)
  const scoreHeader = summary.getCell(scoreRowStart, 1)
  scoreHeader.value = "Score & Distribution"
  scoreHeader.font = { size: 13, bold: true, color: { argb: COLORS.headerText } }
  scoreHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
  scoreHeader.alignment = { vertical: "middle", horizontal: "left" }
  summary.getRow(scoreRowStart).height = 24

  const s = report.summary
  const distRows: [string, number, string, string][] = [
    ["Score", s.score, "FFFFFFFF", "FF0F172A"],
    ["Total checks", s.total, COLORS.infoBg, COLORS.infoText],
    ["Pass", s.pass, COLORS.passBg, COLORS.passText],
    ["Warn", s.warn, COLORS.warnBg, COLORS.warnText],
    ["Fail", s.fail, COLORS.failBg, COLORS.failText],
    ["Info", s.info, COLORS.infoBg, COLORS.infoText],
  ]
  distRows.forEach((r, i) => {
    const row = summary.getRow(scoreRowStart + 1 + i)
    row.getCell(1).value = r[0]
    row.getCell(2).value = r[1]
    row.getCell(1).font = { bold: true, color: { argb: r[3] } }
    row.getCell(2).font = { bold: true, color: { argb: r[3] } }
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: r[2] } }
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: r[2] } }
    row.getCell(1).alignment = { vertical: "middle" }
    row.getCell(2).alignment = { vertical: "middle", horizontal: "right" }
    thinBorders(row.getCell(1))
    thinBorders(row.getCell(2))
  })

  // By severity
  const sevRowStart = scoreRowStart + distRows.length + 2
  summary.mergeCells(sevRowStart, 1, sevRowStart, 4)
  const sevHeader = summary.getCell(sevRowStart, 1)
  sevHeader.value = "By Severity"
  sevHeader.font = { size: 12, bold: true, color: { argb: COLORS.headerText } }
  sevHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
  summary.getRow(sevRowStart).height = 22
  const sevOrder: (keyof typeof s.bySeverity)[] = ["critical", "high", "medium", "low", "info"]
  sevOrder.forEach((k, i) => {
    const row = summary.getRow(sevRowStart + 1 + i)
    const style = severityStyle(k as CheckResult["severity"])
    row.getCell(1).value = k.toUpperCase()
    row.getCell(2).value = s.bySeverity[k] || 0
    row.getCell(1).font = { bold: true, color: { argb: style.text } }
    row.getCell(2).font = { bold: true, color: { argb: style.text } }
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.bg } }
    row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.bg } }
    row.getCell(2).alignment = { horizontal: "right" }
    thinBorders(row.getCell(1))
    thinBorders(row.getCell(2))
  })

  // By category
  const catRowStart = sevRowStart + sevOrder.length + 2
  summary.mergeCells(catRowStart, 1, catRowStart, 4)
  const catHeader = summary.getCell(catRowStart, 1)
  catHeader.value = "By Category"
  catHeader.font = { size: 12, bold: true, color: { argb: COLORS.headerText } }
  catHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
  summary.getRow(catRowStart).height = 22
  const catHeaderRow = summary.getRow(catRowStart + 1)
  catHeaderRow.values = ["Category", "Pass", "Warn", "Fail"]
  applyHeaderRow(catHeaderRow)
  Object.entries(s.byCategory).forEach(([cat, v], i) => {
    const r = summary.getRow(catRowStart + 2 + i)
    r.getCell(1).value = cat
    r.getCell(2).value = v.pass
    r.getCell(3).value = v.warn
    r.getCell(4).value = v.fail
    r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.passBg } }
    r.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.warnBg } }
    r.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.failBg } }
    r.getCell(1).font = { bold: true }
    ;[1, 2, 3, 4].forEach((c) => {
      thinBorders(r.getCell(c))
      if (c > 1) r.getCell(c).alignment = { horizontal: "right" }
    })
  })

  // Embed pie chart image (if browser-side)
  const pieDataUrl = renderPieChartPng([
    { label: "Pass", value: s.pass, color: COLORS.passPie },
    { label: "Warn", value: s.warn, color: COLORS.warnPie },
    { label: "Fail", value: s.fail, color: COLORS.failPie },
    { label: "Info", value: s.info, color: COLORS.infoPie },
  ])
  if (pieDataUrl) {
    const imageId = wb.addImage({
      base64: dataUrlToBase64(pieDataUrl),
      extension: "png",
    })
    summary.addImage(imageId, {
      tl: { col: 5, row: 2 },
      ext: { width: 480, height: 480 },
    })
  }

  // ---------- CHECKS SHEET ----------
  const checks = wb.addWorksheet("Checks", { views: [{ state: "frozen", ySplit: 1 }] })
  checks.columns = [
    { header: "Status", key: "status", width: 10 },
    { header: "Severity", key: "severity", width: 12 },
    { header: "Category", key: "category", width: 16 },
    { header: "Check", key: "name", width: 34 },
    { header: "Message", key: "message", width: 60 },
    { header: "Details", key: "details", width: 40 },
    { header: "Suggested Fix", key: "suggestion", width: 40 },
    { header: "Evidence Count", key: "evidenceCount", width: 16 },
    { header: "Evidence", key: "evidence", width: 80 },
  ]
  applyHeaderRow(checks.getRow(1))

  report.checks.forEach((c) => {
    const row = checks.addRow({
      status: c.status.toUpperCase(),
      severity: c.severity.toUpperCase(),
      category: c.category,
      name: c.name,
      message: c.message,
      details: c.details || "",
      suggestion: c.suggestion || "",
      evidenceCount: c.evidence?.length || 0,
      evidence: c.evidence?.join("\n") || "",
    })
    const sstyle = statusStyle(c.status)
    const sevstyle = severityStyle(c.severity)
    row.getCell("status").fill = { type: "pattern", pattern: "solid", fgColor: { argb: sstyle.bg } }
    row.getCell("status").font = { bold: true, color: { argb: sstyle.text } }
    row.getCell("status").alignment = { vertical: "top", horizontal: "center" }
    row.getCell("severity").fill = { type: "pattern", pattern: "solid", fgColor: { argb: sevstyle.bg } }
    row.getCell("severity").font = { bold: true, color: { argb: sevstyle.text } }
    row.getCell("severity").alignment = { vertical: "top", horizontal: "center" }
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      thinBorders(cell)
      if (colNumber > 2) cell.alignment = { vertical: "top", wrapText: true }
    })
    row.height = Math.min(
      200,
      Math.max(
        20,
        18 + Math.floor((c.message?.length || 0) / 80) * 14 + (c.evidence?.length ? Math.min(c.evidence.length, 8) * 14 : 0),
      ),
    )
  })

  checks.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } }

  // Banded rows
  for (let i = 2; i <= checks.rowCount; i += 2) {
    const r = checks.getRow(i)
    r.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (colNumber > 2 && !cell.fill) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.bandBg } }
      }
    })
  }

  // ---------- LINKS SHEET ----------
  const links = wb.addWorksheet("Links", { views: [{ state: "frozen", ySplit: 1 }] })
  links.columns = [
    { header: "HTTP", key: "status", width: 10 },
    { header: "OK", key: "ok", width: 6 },
    { header: "Type", key: "type", width: 12 },
    { header: "Target", key: "target", width: 10 },
    { header: "Text", key: "text", width: 40 },
    { header: "URL", key: "href", width: 70 },
    { header: "Final URL", key: "finalUrl", width: 70 },
    { header: "Error", key: "error", width: 30 },
  ]
  applyHeaderRow(links.getRow(1))
  report.links.forEach((l) => {
    const row = links.addRow({
      status: l.status ?? "",
      ok: l.ok === false ? "✗" : l.ok === true ? "✓" : "—",
      type: l.type,
      target: l.target || "",
      text: l.text || "",
      href: l.href,
      finalUrl: l.finalUrl || "",
      error: l.error || "",
    })
    const okCell = row.getCell("ok")
    if (l.ok === false) {
      okCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.failBg } }
      okCell.font = { bold: true, color: { argb: COLORS.failText } }
    } else if (l.ok === true) {
      okCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.passBg } }
      okCell.font = { bold: true, color: { argb: COLORS.passText } }
    }
    okCell.alignment = { horizontal: "center" }
    row.eachCell({ includeEmpty: true }, (cell) => {
      thinBorders(cell)
      cell.alignment = { ...cell.alignment, vertical: "top", wrapText: true }
    })
  })
  links.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } }

  // ---------- IMAGES SHEET ----------
  const imgs = wb.addWorksheet("Images", { views: [{ state: "frozen", ySplit: 1 }] })
  imgs.columns = [
    { header: "Has Alt", key: "hasAlt", width: 10 },
    { header: "Alt Text", key: "alt", width: 50 },
    { header: "Width", key: "width", width: 10 },
    { header: "Height", key: "height", width: 10 },
    { header: "Source", key: "src", width: 80 },
  ]
  applyHeaderRow(imgs.getRow(1))
  report.images.forEach((img) => {
    const row = imgs.addRow({
      hasAlt: img.hasAlt ? "✓" : "✗",
      alt: img.alt || "",
      width: img.width || "",
      height: img.height || "",
      src: img.src,
    })
    const cell = row.getCell("hasAlt")
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: img.hasAlt ? COLORS.passBg : COLORS.failBg },
    }
    cell.font = { bold: true, color: { argb: img.hasAlt ? COLORS.passText : COLORS.failText } }
    cell.alignment = { horizontal: "center" }
    row.eachCell({ includeEmpty: true }, (c) => thinBorders(c))
  })
  imgs.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 5 } }

  // ---------- HEADINGS SHEET ----------
  const headings = wb.addWorksheet("Headings", { views: [{ state: "frozen", ySplit: 1 }] })
  headings.columns = [
    { header: "Level", key: "level", width: 8 },
    { header: "Indent", key: "indent", width: 30 },
    { header: "Text", key: "text", width: 90 },
  ]
  applyHeaderRow(headings.getRow(1))
  report.headings.forEach((h) => {
    const row = headings.addRow({
      level: `H${h.level}`,
      indent: "".padStart((h.level - 1) * 4, " ") + (h.level > 1 ? "↳ " : ""),
      text: h.text,
    })
    row.getCell("level").alignment = { horizontal: "center" }
    row.getCell("level").font = { bold: true }
    row.eachCell({ includeEmpty: true }, (c) => thinBorders(c))
  })

  // ---------- META TAGS SHEET ----------
  const meta = wb.addWorksheet("Meta Tags", { views: [{ state: "frozen", ySplit: 1 }] })
  meta.columns = [
    { header: "Key", key: "k", width: 40 },
    { header: "Value", key: "v", width: 110 },
  ]
  applyHeaderRow(meta.getRow(1))
  Object.entries(report.metaTags).forEach(([k, v]) => {
    const row = meta.addRow({ k, v })
    row.getCell("k").font = { bold: true }
    row.eachCell({ includeEmpty: true }, (c) => {
      thinBorders(c)
      c.alignment = { vertical: "top", wrapText: true }
    })
  })

  // ---------- EXPORT ----------
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const safeHost = (() => {
    try {
      return new URL(report.meta.finalUrl).hostname.replace(/\W+/g, "-")
    } catch {
      return "scan"
    }
  })()
  a.download = `qa-scan-${safeHost}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
