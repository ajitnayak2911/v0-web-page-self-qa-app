import { cn } from "@/lib/utils"

export function BroadridgeLogo({
  className,
  variant = "dark",
}: {
  className?: string
  variant?: "dark" | "light"
}) {
  const fg = variant === "dark" ? "#ffffff" : "#0b1f4d"
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="3" fill={fg} />
        <path
          d="M9 9 L16 16 L9 23 Z M23 9 L16 16 L23 23 Z"
          fill={variant === "dark" ? "#0b1f4d" : "#ffffff"}
        />
      </svg>
      <span
        className="text-xl font-semibold tracking-tight"
        style={{ color: fg }}
      >
        Broadridge
        <sup className="text-[0.5em] ml-0.5 align-super" style={{ color: fg }}>
          ®
        </sup>
      </span>
    </div>
  )
}
