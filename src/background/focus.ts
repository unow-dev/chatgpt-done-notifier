export async function focus(windowId?: number, tabId?: number): Promise<void> {
  // 先にタブ存在確認（無ければ reject）
  if (tabId && tabId > 0) {
    // Promise API: 存在しなければ reject される
    await chrome.tabs.get(tabId);
  }
  try {
    if (windowId && windowId > 0) {
      await chrome.windows.update(windowId, { focused: true, drawAttention: true });
    }
  } catch {}
  try {
    if (tabId && tabId > 0) {
      await chrome.tabs.update(tabId, { active: true });
    }
  } catch {}
}
