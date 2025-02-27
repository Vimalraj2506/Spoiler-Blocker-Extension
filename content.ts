interface Topic {
  id: string
  name: string
  keywords: string[]
}

interface Settings {
  enabled: boolean
  topics: Topic[]
}

let currentSettings: Settings = {
  enabled: true,
  topics: [],
}

// Add message type for logging
interface LogMessage {
  type: "ADD_LOG"
  entry: {
    type: "block" | "allow" | "detect"
    content: string
    url?: string
  }
}

// Helper function to safely access chrome storage
const getChromeStorage = async () => {
  if (typeof chrome === "undefined" || !chrome.storage?.sync) {
    console.warn("Chrome storage is not available")
    return { enabled: true, topics: [] }
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get(["enabled", "topics"], (result) => resolve(result))
  })
}

// Update the initial settings load
const initializeSettings = async () => {
  try {
    const result = await getChromeStorage()
    currentSettings = {
      enabled: result.enabled !== undefined ? result.enabled : true,
      topics: result.topics || [],
    }
    scanPage()
  } catch (error) {
    console.error("Failed to initialize settings:", error)
  }
}

// Call initialize function
initializeSettings()

// Update the message listener
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "UPDATE_SETTINGS") {
      currentSettings = request.settings
      scanPage()
      sendResponse({ success: true })
    }
  })
}

function createSpoilerOverlay(element: Element, keyword: string) {
  const overlay = document.createElement("div")
  overlay.className = "spoiler-overlay"

  // Apply styles with blur effect
  const styles = {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: "10000",
    fontSize: "14px",
    padding: "10px",
    textAlign: "center",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    transition: "all 0.2s ease-in-out",
  }

  Object.assign(overlay.style, styles)

  // Create warning message
  const warningMessage = document.createElement("div")
  warningMessage.className = "spoiler-warning"
  warningMessage.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <div style="font-weight: 500;">Potential Spoiler Content</div>
      <div style="font-size: 12px; opacity: 0.7;">Click to reveal</div>
    </div>
  `

  overlay.appendChild(warningMessage)

  // Position the container relatively if it isn't already
  const computedStyle = window.getComputedStyle(element)
  if (computedStyle.position === "static") {
    element.setAttribute("style", "position: relative;")
  }

  // Add blur effect to the content
  element.style.transition = "all 0.2s ease-in-out"

  // Send log message
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.sendMessage({
      type: "ADD_LOG",
      entry: {
        type: "detect",
        content: `Spoiler detected: "${keyword}"`,
        url: window.location.href,
      },
    })
  }

  overlay.addEventListener("click", (e) => {
    e.stopPropagation()
    overlay.style.opacity = "0"
    setTimeout(() => overlay.remove(), 200)
  })

  element.appendChild(overlay)
}

// Update scanPage function to pass keyword to createSpoilerOverlay
function scanPage() {
  if (!currentSettings.enabled || currentSettings.topics.length === 0) return

  // Remove existing overlays
  document.querySelectorAll(".spoiler-overlay").forEach((overlay) => {
    overlay.remove()
  })

  // Get all text nodes
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)

  const textNodes: Node[] = []
  let node
  while ((node = walker.nextNode())) {
    textNodes.push(node)
  }

  // Check each text node for spoiler content
  textNodes.forEach((node) => {
    const text = node.textContent?.toLowerCase() || ""

    for (const topic of currentSettings.topics) {
      const matchedKeyword = topic.keywords.find((keyword) => text.includes(keyword.toLowerCase()))

      if (matchedKeyword) {
        const element = node.parentElement
        if (element) {
          // Check if parent already has a spoiler overlay
          if (!element.querySelector(".spoiler-overlay")) {
            createSpoilerOverlay(element, matchedKeyword)
          }
        }
        break
      }
    }
  })
}

// Run initial scan
scanPage()

// Scan for new content periodically
const observer = new MutationObserver(() => {
  scanPage()
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
})

export {}

