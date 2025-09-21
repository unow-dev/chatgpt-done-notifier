// ====== グローバル待機配列とバッジ ======
const store = chrome.storage.session ?? chrome.storage.local;
let PENDING = []; // [{tabId, windowId, url, sentAt}]

async function loadQueue() {
  const { pending = [] } = await store.get({ pending: [] });
  PENDING = Array.isArray(pending) ? pending : [];
  updateBadgeGlobal();
}
async function saveQueue() {
  await store.set({ pending: PENDING });
}

function updateBadgeGlobal() {
  const n = PENDING.length;
  chrome.action.setBadgeText({ text: n > 0 ? String(n) : '' }); // 全タブ共通
  if (n > 0) chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
}

chrome.runtime.onInstalled.addListener(loadQueue);
chrome.runtime.onStartup?.addListener(loadQueue);

// ====== メッセージ受信 ======
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender?.tab?.id ?? -1;
  const windowId = sender?.tab?.windowId ?? -1;

  if (msg?.type === 'pending-add') {
    PENDING.push({
      tabId,
      windowId,
      url: sender?.tab?.url,
      sentAt: Date.now(),
    });
    updateBadgeGlobal();
    saveQueue();
    sendResponse?.({ ok: true, size: PENDING.length });
    return; // sync
  }

  if (msg?.type === 'pending-done') {
    // そのタブに対応する先頭要素を1件だけ除去
    const idx = PENDING.findIndex(x => x.tabId === tabId);
    if (idx >= 0) PENDING.splice(idx, 1);
    updateBadgeGlobal();
    saveQueue();
    sendResponse?.({ ok: true, size: PENDING.length });
    return; // sync
  }

  if (msg?.type === 'notify') {
    const title = msg.title || 'ChatGPT 返答が完了';
    const message = msg.message || '応答生成が完了しました';
    const nid = `done:t=${tabId}:w=${windowId}:${Date.now()}`;
    chrome.notifications.create(nid, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority: 2,
    });
    sendResponse?.({ ok: true, id: nid });
    return;
  }
});

// ====== 通知クリックで当該タブへ移動 ======
chrome.notifications.onClicked.addListener(notificationId => {
  const m = /^done:t=(-?\d+):w=(-?\d+):/.exec(notificationId);
  if (!m) {
    chrome.notifications.clear(notificationId);
    return;
  }
  const tabId = parseInt(m[1], 10),
    windowId = parseInt(m[2], 10);
  if (windowId > 0)
    chrome.windows.update(windowId, { focused: true, drawAttention: true });
  if (tabId > 0) chrome.tabs.update(tabId, { active: true });
  chrome.notifications.clear(notificationId);
});

// タブが閉じられたら、そのタブ由来の待機を全て除去
chrome.tabs.onRemoved.addListener(closedTabId => {
  const before = PENDING.length;
  PENDING = PENDING.filter(x => x.tabId !== closedTabId);
  if (PENDING.length !== before) {
    updateBadgeGlobal();
    saveQueue();
  }
});
