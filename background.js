// 状態
const notifMap = Object.create(null); // notificationId -> { tabId, windowId }

// 初期設定
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ enabled: true });
});

// ショートカットで有効/無効トグル
chrome.commands.onCommand.addListener(cmd => {
  if (cmd === 'toggle-monitoring') {
    chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
      chrome.storage.local.set({ enabled: !enabled });
    });
  }
});

// --- 通知作成: 通知IDに tabId/windowId をエンコード ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'notify') {
    const tabId = sender?.tab?.id ?? -1;
    const windowId = sender?.tab?.windowId ?? -1;
    const title = msg.title || 'ChatGPT 返答が完了';
    const message = msg.message || '応答生成が完了しました';

    // 例: done:t=123:w=456:1690000000000
    const nid = `done:t=${tabId}:w=${windowId}:${Date.now()}`;

    chrome.notifications.create(nid, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority: 2,
      requireInteraction: false
    }, () => sendResponse?.({ ok: true, id: nid }));

    return true; // async sendResponse
  }
});

// --- クリックで発信タブへ移動（SW再起動でも動く） ---
chrome.notifications.onClicked.addListener((notificationId) => {
  const m = /^done:t=(-?\d+):w=(-?\d+):/.exec(notificationId);
  if (!m) { chrome.notifications.clear(notificationId); return; }
  const tabId = parseInt(m[1], 10);
  const windowId = parseInt(m[2], 10);

  // フォーカス処理（権限: tabs, windows）
  const focusWindow = Number.isInteger(windowId) && windowId > 0
    ? new Promise(r => chrome.windows.update(windowId, { focused: true, drawAttention: true }, () => r()))
    : Promise.resolve();

  focusWindow.then(() => {
    if (Number.isInteger(tabId) && tabId > 0) {
      chrome.tabs.update(tabId, { active: true });
    }
    chrome.notifications.clear(notificationId);
  });
});

