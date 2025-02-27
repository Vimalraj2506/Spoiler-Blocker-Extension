chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ADD_LOG") {
    chrome.storage.sync.get(["logs"], (result) => {
      const currentLogs = result.logs || []
      const newLog = {
        ...message.entry,
        id: Date.now().toString(),
        timestamp: new Date(),
      }

      // Keep last 50 entries
      const updatedLogs = [newLog, ...currentLogs].slice(0, 50)

      chrome.storage.sync.set({ logs: updatedLogs })
    })
  }
})

