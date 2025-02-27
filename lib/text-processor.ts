export interface TextMatch {
  keyword: string
  index: number
  length: number
}

export class TextProcessor {
  private keywords: string[]

  constructor(keywords: string[] = []) {
    this.keywords = keywords.map((k) => k.toLowerCase())
  }

  setKeywords(keywords: string[]) {
    this.keywords = keywords.map((k) => k.toLowerCase())
  }

  processText(text: string): {
    hasSpoilers: boolean
    matches: string[]
    positions: TextMatch[]
  } {
    const lowerText = text.toLowerCase()
    const matches = this.keywords.filter((keyword) => lowerText.includes(keyword))

    const positions = matches.map((keyword) => {
      const index = lowerText.indexOf(keyword)
      return {
        keyword,
        index,
        length: keyword.length,
      }
    })

    return {
      hasSpoilers: matches.length > 0,
      matches,
      positions,
    }
  }

  // Helper method to extract context around matches
  getMatchContext(text: string, match: TextMatch, contextSize = 20): string {
    const start = Math.max(0, match.index - contextSize)
    const end = Math.min(text.length, match.index + match.length + contextSize)
    return text.slice(start, end)
  }

  // Advanced processing with natural language understanding
  // This could be extended with more sophisticated NLP techniques
  analyzeContext(text: string): {
    confidence: number
    relevantPhrases: string[]
  } {
    const words = text.toLowerCase().split(/\s+/)
    const relevantPhrases: string[] = []
    let confidence = 0

    // Simple context analysis
    this.keywords.forEach((keyword) => {
      const keywordIndex = words.indexOf(keyword)
      if (keywordIndex !== -1) {
        // Look at surrounding words for context
        const start = Math.max(0, keywordIndex - 2)
        const end = Math.min(words.length, keywordIndex + 3)
        const phrase = words.slice(start, end).join(" ")
        relevantPhrases.push(phrase)
        confidence += 0.2 // Increase confidence for each match
      }
    })

    return {
      confidence: Math.min(confidence, 1), // Cap at 1.0
      relevantPhrases,
    }
  }
}

