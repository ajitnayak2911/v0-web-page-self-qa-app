import Image from "next/image"
import { cn } from "@/lib/utils"

export function BroadridgeLogo({
  className,
  // variant kept for backwards-compat with existing callers; the official
  // brand logo only ships in a dark-on-light form, so we render it on a
  // small white tile when used over dark backgrounds.
  variant = "light",
}: {
  className?: string
  variant?: "dark" | "light"
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center",
        variant === "dark" && "bg-white rounded-md px-3 py-1.5",
        className,
      )}
    >
      <Image
        src="/broadridge-logo.png"
        alt="Broadridge"
        width={180}
        height={36}
        priority
        className="h-7 w-auto"
      />
    </div>
  )
}
