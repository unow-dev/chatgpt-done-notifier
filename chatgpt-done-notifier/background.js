// =============================
// 背景: 通知 + バッジ待機件数
// =============================
const CHAT_PATTERNS = [/^https:\/\/chat\.openai\.com\//, /^https:\/\/chatgpt\.com\//];
const isChatUrl = (url) => CHAT_PATTERNS.some(r => r.test(url || ""));

// 永続(セッション)記憶: SW再起動でも保持（ブラウザ再起動で消える）。
const store = chrome.storage.session ?? chrome.storage.local;
let COUNTS = {}; // { [tabId]: number }

async function loadCounts() {
  const obj = await store.get({ counts: {} });
  COUNTS = obj.counts || {};
}
async function saveCounts() { await store.set({ counts: COUNTS }); }

function setBadge(tabId, text, color) {
  chrome.action.setBadgeText({ tabId, text: String(text || "") });
  if (text) chrome.action.setBadgeBackgroundColor({ tabId, color });
}

function badgePending(tabId) {
  const n = Math.max(0, Number(COUNTS[tabId] || 0));
  if (n > 0) setBadge(tabId, n, "#ef4444");
  else setBadge(tabId, "", "#000000"); // 0件は空表示（probe時にON/RDY/OFFへ）
}

function setBadgeState(tabId, { enabled, monitoring }) {
  // 件数優先。0件のときのみ状態表示。
  const n = Math.max(0, Number(COUNTS[tabId] || 0));
  if (n > 0) return badgePending(tabId);
  const text = enabled ? (monitoring ? "ON" : "RDY") : "OFF";
  const color = enabled ? (monitoring ? "#10b981" : "#6b7280") : "#ef4444";
  setBadge(tabId, text, color);
}

async function incPending(tabId, delta) {
  if (!Number.isInteger(tabId)) return;
  const cur = Math.max(0, COUNTS[tabId] || 0);
  const next = Math.max(0, cur + delta);
  if (next === cur) return;
  COUNTS[tabId] = next;
  await saveCounts();
  badgePending(tabId);
}

chrome.runtime.onInstalled.addListener(loadCounts);
chrome.runtime.onStartup?.addListener(loadCounts);

// キーでON/OFFトグル
chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'toggle-monitoring') {
    chrome.storage.local.get({ enabled: true }, ({ enabled }) => {
      chrome.storage.local.set({ enabled: !enabled });
    });
  }
});

// content からのメッセージ
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender?.tab?.id;
  if (!msg) return;
  if (msg.type === 'notify') {
    // 通知（クリックで発信タブへ移動）
    const windowId = sender?.tab?.windowId ?? -1;
    const title = msg.title || 'ChatGPT 返答が完了';
    const message = msg.message || '応答生成が完了しました';
    const nid = `done:t=${tabId ?? -1}:w=${windowId}:${Date.now()}`;
    chrome.notifications.create(nid, { type: 'basic', iconUrl: 'icons/icon128.png', title, message, priority: 2 });
    sendResponse?.({ ok: true, id: nid });
    return; // sync OK
  }
  if (msg.type === 'pending') {
    // {delta: +1|-1}
    incPending(tabId, msg.delta ?? 0);
    sendResponse?.({ ok: true });
    return; // sync OK
  }
  if (msg.type === 'probe-setbadge') {
    // content から現在状態をもらってバッジ表示
    setBadgeState(tabId, { enabled: !!msg.enabled, monitoring: !!msg.monitoring });
    sendResponse?.({ ok: true });
    return;
  }
});

// 通知クリックで発信タブへ移動
chrome.notifications.onClicked.addListener((notificationId) => {
  const m = /^done:t=(-?\d+):w=(-?\d+):/.exec(notificationId);
  if (!m) { chrome.notifications.clear(notificationId); return; }
  const tabId = parseInt(m[1], 10);
  const windowId = parseInt(m[2], 10);
  if (windowId > 0) chrome.windows.update(windowId, { focused: true, drawAttention: true });
  if (tabId > 0) chrome.tabs.update(tabId, { active: true });
  chrome.notifications.clear(notificationId);
});

// タブが閉じられたらカウント破棄
chrome.tabs.onRemoved.addListener((tabId) => { delete COUNTS[tabId]; saveCounts(); });

// タブ/ウィンドウのアクティベーションで probe（数0ならON/RDY/OFFを描画）
function probeTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab || !isChatUrl(tab.url)) { chrome.action.setBadgeText({ tabId, text: '' }); return; }
    const n = Math.max(0, Number(COUNTS[tabId] || 0));
    if (n > 0) { badgePending(tabId); return; }
    chrome.tabs.sendMessage(tabId, { type: 'probe' }, (res) => {
      if (chrome.runtime.lastError || !res) { chrome.action.setBadgeText({ tabId, text: '' }); return; }
      setBadgeState(tabId, { enabled: !!res.enabled, monitoring: !!res.monitoring });
    });
  });
}

chrome.tabs.onActivated.addListener(({ tabId }) => probeTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, info, tab) => { if (tab?.active && info.status === 'complete') probeTab(tabId); });
chrome.windows.onFocusChanged.addListener((winId) => {
  if (winId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ windowId: winId, active: true }, (tabs) => { if (tabs[0]?.id) probeTab(tabs[0].id); });
});
