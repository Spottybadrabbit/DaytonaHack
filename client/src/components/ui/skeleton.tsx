import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "title" | "text";
  animate?: boolean;
}

function Skeleton({
  className,
  variant = "default",
  animate = true,
  ...props
}: SkeletonProps) {
  const variants = {
    default: "h-4 w-full",
    card: "h-[180px] w-full",
    title: "h-8 w-[200px]",
    text: "h-4 w-[300px]",
  }

  return (
    <div
      className={cn(
        animate ? "animate-pulse" : "",
        "rounded-md bg-muted",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }