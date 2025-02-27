import { NextResponse } from "next/server"

// In-memory cache for demo. In production, use Redis or similar
const keywordCache: Record<string, string[]> = {}

export async function POST(req: Request) {
  try {
    const { userId, keywords } = await req.json()

    if (!userId || !Array.isArray(keywords)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    // Store keywords for the user
    keywordCache[userId] = keywords

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const userKeywords = keywordCache[userId] || []
    return NextResponse.json({ keywords: userKeywords })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch keywords" }, { status: 500 })
  }
}

