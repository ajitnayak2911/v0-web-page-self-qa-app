import { cn } from "@/lib/utils"

/**
 * Broadridge wordmark only (no leaf/wing mark). Tight bounding box so it
 * scales cleanly via height utilities.
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

  return (
    <svg
      role="img"
      aria-label="Broadridge"
      viewBox="0 0 200 56"
      className={cn(heights[size], "w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Wordmark "Broadridge" */}
      <text
        x="0"
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
        x="175"
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
