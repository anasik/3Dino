window.addEventListener("offline", () => {
  chrome.runtime.sendMessage({ status: "offline" });
});

// optional — pause if game is active in future
window.addEventListener("online", () => {
  chrome.runtime.sendMessage({ status: "online" });
});
