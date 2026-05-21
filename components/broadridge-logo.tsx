import { cn } from "@/lib/utils"

/**
 * Broadridge wordmark: navy square with a stylized white leaf/wing mark,
 * followed by the "Broadridge" wordmark. Tight bounding box so it scales
 * cleanly via height utilities (no baked-in whitespace).
 */
export function BroadridgeLogo({
  className,
  variant = "dark",
  size = "md",
}: {
  className?: string
  variant?: "dark" | "light"
  size?: "sm" | "md" | "lg"
}) {
  const heights: Record<string, string> = {
    sm: "h-6",
    md: "h-9",
    lg: "h-11",
  }
  const wordColor = variant === "light" ? "#FFFFFF" : "#0A1F44"
  const markBg = variant === "light" ? "#FFFFFF" : "#0A1F44"
  const markFg = variant === "light" ? "#0A1F44" : "#FFFFFF"

  return (
    <svg
      role="img"
      aria-label="Broadridge"
      viewBox="0 0 260 56"
      className={cn(heights[size], "w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Mark: solid square with stylized leaf/wing */}
      <rect x="0" y="0" width="56" height="56" rx="2" fill={markBg} />
      <path
        d="M14 12 C24 14, 30 22, 30 32 C30 22, 36 14, 46 12 C40 22, 36 32, 36 44 C32 38, 28 38, 24 44 C24 32, 20 22, 14 12 Z"
        fill={markFg}
      />
      {/* Wordmark "Broadridge" */}
      <text
        x="72"
        y="38"
        fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        fontWeight="700"
        fontSize="32"
        letterSpacing="-0.5"
        fill={wordColor}
      >
        Broadridge
      </text>
      {/* Registered trademark */}
      <text
        x="247"
        y="20"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight="500"
        fontSize="9"
        fill={wordColor}
      >
        ®
      </text>
    </svg>
  )
}
