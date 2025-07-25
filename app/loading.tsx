import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <h2 className="mt-4 text-xl font-medium">Loading Dev Diary...</h2>
      <p className="mt-2 text-muted-foreground">Preparing your workspace</p>
    </div>
  )
}