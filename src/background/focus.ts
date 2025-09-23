export async function focus(windowId?: number, tabId?: number) {
  try { if (windowId && windowId > 0) await chrome.windows.update(windowId, { focused: true, drawAttention: true }); } catch {}
  try { if (tabId && tabId > 0) await chrome.tabs.update(tabId, { active: true }); } catch {}
}
