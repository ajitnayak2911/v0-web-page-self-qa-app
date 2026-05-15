"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Search, Globe } from "lucide-react"

interface Props {
  onScan: (url: string, validateLinks: boolean) => Promise<void>
  loading: boolean
}

const examples = [
  "https://www.broadridge.com",
  "https://www.vercel.com",
  "https://nextjs.org",
]

export function ScanForm({ onScan, loading }: Props) {
  const [url, setUrl] = useState("")
  const [validateLinks, setValidateLinks] = useState(true)

  return (
    <Card className="border-border">
      <CardContent className="pt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (url.trim()) onScan(url.trim(), validateLinks)
          }}
          className="flex flex-col gap-4"
        >
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

          <div className="flex flex-wrap items-center gap-2 pt-2">
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
