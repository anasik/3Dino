let gameTabId = null;
let gameTabOpening = false;

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.status === "offline") {
    if (gameTabId || gameTabOpening) return;

    gameTabOpening = true;

    chrome.tabs.create({
      url: chrome.runtime.getURL("index.html")
    }, (tab) => {
      gameTabId = tab.id;
      gameTabOpening = false;
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === gameTabId) {
    gameTabId = null;
  }
});
