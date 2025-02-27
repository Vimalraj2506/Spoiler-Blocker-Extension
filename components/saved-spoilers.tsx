import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface SavedSpoilersProps {
  topics: Array<{
    id: string
    name: string
    keywords: string[]
  }>
}

export function SavedSpoilers({ topics }: SavedSpoilersProps) {
  const [revealedSpoilers, setRevealedSpoilers] = React.useState<Set<string>>(new Set())

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4 pr-4">
        {topics.map((topic) => (
          <Card
            key={topic.id}
            className={cn(
              "p-4 space-y-2 relative overflow-hidden transition-all duration-200",
              "bg-white/50 backdrop-blur-sm hover:bg-white/60",
              !revealedSpoilers.has(topic.id) && "cursor-pointer",
            )}
            onClick={() => toggleSpoiler(topic.id)}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-primary-700">{topic.name}</h4>
              {revealedSpoilers.has(topic.id) ? (
                <Eye className="h-4 w-4 text-primary-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-primary-500" />
              )}
            </div>

            <div
              className={cn("transition-all duration-200", !revealedSpoilers.has(topic.id) && "blur-md select-none")}
            >
              <div className="flex flex-wrap gap-2">
                {topic.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="bg-secondary-100 text-secondary-700">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            {!revealedSpoilers.has(topic.id) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
                <span className="text-sm font-medium text-primary-700">Click to reveal spoilers</span>
              </div>
            )}
          </Card>
        ))}
        {topics.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p>No saved spoilers</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

