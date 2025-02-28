// Background service worker
// This runs in the background and can communicate with content scripts

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Spoiler Blocker extension installed');
  });
  
  // Listen for messages from popup or content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getKeywords') {
      // Retrieve keywords from storage and send to content script
      chrome.storage.local.get('keywords', (data) => {
        sendResponse({ keywords: data.keywords || [] });
      });
      return true; // Required for async response
    }
  });