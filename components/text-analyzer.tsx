"use client"

import * as React from "react"
import { TextProcessor, type TextMatch } from "@/lib/text-processor"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

interface TextAnalyzerProps {
  keywords: string[]
  onSpoilerFound?: (matches: string[]) => void
}

export function TextAnalyzer({ keywords, onSpoilerFound }: TextAnalyzerProps) {
  const [text, setText] = React.useState("")
  const [analysis, setAnalysis] = React.useState<{
    hasSpoilers: boolean
    matches: string[]
    positions: TextMatch[]
  } | null>(null)
  const processor = React.useMemo(() => new TextProcessor(keywords), [keywords])

  const analyzeText = React.useCallback(() => {
    const result = processor.processText(text)
    setAnalysis(result)
    if (result.hasSpoilers && onSpoilerFound) {
      onSpoilerFound(result.matches)
    }
  }, [text, processor, onSpoilerFound])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text Analyzer</CardTitle>
        <CardDescription>Paste text to check for potential spoilers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter text to analyze..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
        />
        {analysis?.hasSpoilers && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Spoiler Alert!</AlertTitle>
            <AlertDescription>Found potential spoilers related to: {analysis.matches.join(", ")}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={analyzeText} disabled={!text.trim()}>
          Analyze Text
        </Button>
      </CardFooter>
    </Card>
  )
}

