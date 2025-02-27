import { NextResponse } from "next/server"

interface ProcessRequest {
  text: string
  keywords: string[]
}

export async function POST(req: Request) {
  try {
    const { text, keywords }: ProcessRequest = await req.json()

    if (!text || !Array.isArray(keywords)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    // Convert text and keywords to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase()
    const lowerKeywords = keywords.map((k) => k.toLowerCase())

    // Find matches
    const matches = lowerKeywords.filter((keyword) => lowerText.includes(keyword))

    // Calculate positions of matches
    const positions = matches.map((keyword) => {
      const index = lowerText.indexOf(keyword)
      return {
        keyword,
        index,
        length: keyword.length,
      }
    })

    return NextResponse.json({
      hasSpoilers: matches.length > 0,
      matches,
      positions,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to process text" }, { status: 500 })
  }
}

