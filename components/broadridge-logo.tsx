import Image from "next/image"
import { cn } from "@/lib/utils"

export function BroadridgeLogo({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const heights: Record<string, string> = {
    sm: "h-7",
    md: "h-9",
    lg: "h-11",
  }
  return (
    <Image
      src="/broadridge-logo.png"
      alt="Broadridge"
      width={400}
      height={80}
      priority
      className={cn("w-auto", heights[size], className)}
    />
  )
}
