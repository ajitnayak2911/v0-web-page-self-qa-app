"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Search, Globe, Lock, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react"

interface Props {
  onScan: (url: string, validateLinks: boolean, username?: string, password?: string) => Promise<void>
  loading: boolean
}

const examples = [
  "https://www.broadridge.com",
  "https://www.vercel.com",
  "https://nextjs.org",
]

// Heuristic: treat these hostname patterns as protected dev/staging environments
const DEV_PATTERNS = [/-dev\./i, /-staging\./i, /-uat\./i, /-qa\./i, /\.dev\./i, /www-dev\./i, /stage\./i, /preprod\./i]

function looksLikeProtectedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url.match(/^https?:\/\//i) ? url : `https://${url}`)
    return DEV_PATTERNS.some((p) => p.test(hostname))
  } catch {
    return false
  }
}

export function ScanForm({ onScan, loading }: Props) {
  const [url, setUrl] = useState("")
  const [validateLinks, setValidateLinks] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Auto-expand auth panel when URL looks like a protected environment
  useEffect(() => {
    if (looksLikeProtectedUrl(url)) {
      setShowAuth(true)
    }
  }, [url])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    const u = username.trim() || undefined
    const p = password.trim() || undefined
    onScan(url.trim(), validateLinks, u, p)
  }

  const isProtected = looksLikeProtectedUrl(url)

  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* URL row */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="url" className="text-sm font-medium">
              Webpage URL
            </Label>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="url"
                  placeholder="https://www.broadridge.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-9 h-11"
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading || !url.trim()} className="h-11 px-6">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Run Deep Scan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Auth toggle */}
          <button
            type="button"
            onClick={() => setShowAuth((v) => !v)}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <Lock className="h-3.5 w-3.5" />
            {isProtected ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Protected URL detected — enter credentials
              </span>
            ) : (
              <span>Protected / dev URL? Add credentials (optional)</span>
            )}
            {showAuth ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {/* Auth panel */}
          {showAuth && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 flex flex-col gap-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Credentials are used only for fetching this page via HTTP Basic Auth and are never stored or logged.
                For dev/staging environments protected by a browser login prompt (e.g. <code className="font-mono bg-muted px-1 rounded">www-dev.*</code>).
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-username" className="text-xs font-medium">
                    Username
                  </Label>
                  <Input
                    id="auth-username"
                    placeholder="broadridgedigital"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    disabled={loading}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="auth-password" className="text-xs font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={loading}
                      className="h-9 text-sm pr-9"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              {username && password && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Credentials set — scanner will send Basic Auth header automatically.
                </p>
              )}
            </div>
          )}

          {/* Validate links checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="validate"
              checked={validateLinks}
              onCheckedChange={(v) => setValidateLinks(!!v)}
              disabled={loading}
            />
            <Label htmlFor="validate" className="text-sm text-muted-foreground cursor-pointer">
              Validate all links (HTTP status, redirects, broken — slower)
            </Label>
          </div>

          {/* Quick-fill examples */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Try:</span>
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={loading}
                onClick={() => setUrl(ex)}
                className="text-xs px-2 py-1 rounded-md border border-border bg-muted/30 hover:bg-muted transition-colors disabled:opacity-50"
              >
                {ex.replace(/^https?:\/\//, "")}
              </button>
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
