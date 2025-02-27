import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LogEntry {
  id: string
  type: "block" | "allow" | "detect"
  content: string
  timestamp: Date
  url?: string
}

interface ActivityLogProps {
  logs: LogEntry[]
}

export function ActivityLog({ logs }: ActivityLogProps) {
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "block":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "allow":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "detect":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getLogBadge = (type: LogEntry["type"]) => {
    switch (type) {
      case "block":
        return (
          <Badge variant="destructive" className="ml-2">
            Blocked
          </Badge>
        )
      case "allow":
        return (
          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
            Allowed
          </Badge>
        )
      case "detect":
        return (
          <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">
            Detected
          </Badge>
        )
    }
  }

  return (
    <Card className="border-secondary-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary-700 flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-primary-500" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px] px-4">
          {logs.length > 0 ? (
            <div className="space-y-4 pb-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-2 text-sm animate-fade-in",
                    "p-2 rounded-lg transition-colors",
                    "hover:bg-secondary-50",
                  )}
                >
                  <div className="mt-0.5">{getLogIcon(log.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center">
                      <span className="font-medium text-primary-700">{log.content}</span>
                      {getLogBadge(log.type)}
                    </div>
                    {log.url && <div className="text-xs text-muted-foreground truncate">{log.url}</div>}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[160px] text-muted-foreground">
              <Clock className="h-8 w-8 text-secondary-400 mb-2" />
              <p className="text-sm">No activity logged yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

