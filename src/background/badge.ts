import { BADGE_COLOR } from '../shared/constants';

let CURRENT = 0;
let pendingTimer: number | null = null;

// --- feature detection: setBadgeTextColor（Chromeが未対応なら無視） ---
function setTextColorGlobal(color: string) {
  try {
    const anyAction = chrome.action as unknown as { setBadgeTextColor?: (d: { color: string }) => void };
    if (typeof anyAction.setBadgeTextColor === 'function') {
      anyAction.setBadgeTextColor!({ color });
    }
  } catch {}
}

// 少しだけコンパクトにする表記（最大3〜4文字）
// 0→"" / <100→"n" / [100,1000)→"99+" / [1k,10k)→"1.2k" / [10k,1M)→"12k" / ≥1M→"1M+"
function fmt(n: number): string {
  if (n <= 0) return '';
  if (n < 100) return String(n);
  if (n < 1000) return '99+';
  if (n < 10_000) return `${Math.floor(n / 100) / 10}k`; // 1.2k
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;  // 12k, 123k
  return '1M+';
}

function applyToAllTabs(text: string) {
  chrome.tabs.query({}, (tabs) => {
    for (const t of tabs) {
      if (t.id != null) {
        chrome.action.setBadgeText({ tabId: t.id, text });
        if (text) {
          chrome.action.setBadgeBackgroundColor({ tabId: t.id, color: BADGE_COLOR });
          setTextColorGlobal('#FFFFFF'); // 利用可能なら白文字を強制
        }
      }
    }
  });
}

function doUpdate() {
  const text = fmt(CURRENT);
  // デフォルト（新規タブにも反映）
  chrome.action.setBadgeText({ text });
  if (text) {
    chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    setTextColorGlobal('#FFFFFF'); // 利用可能なら白文字
  }
  // 既存の全タブへも適用
  applyToAllTabs(text);
}

/** バッジ数をセット（デバウンスして全タブへ反映） */
export function setBadgeCount(n: number) {
  CURRENT = Math.max(0, n | 0);
  if (pendingTimer) clearTimeout(pendingTimer as unknown as number);
  pendingTimer = setTimeout(() => { pendingTimer = null; doUpdate(); }, 0) as unknown as number;
}

/** タブ/ウィンドウのライフサイクルに追従して再適用 */
export function initBadgeWiring() {
  const reapply = (tabId?: number) => {
    const text = fmt(CURRENT);
    if (tabId != null) {
      chrome.action.setBadgeText({ tabId, text });
      if (text) {
        chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
        setTextColorGlobal('#FFFFFF');
      }
    } else {
      doUpdate();
    }
  };
  chrome.tabs.onCreated.addListener((t) => reapply(t.id!));
  chrome.tabs.onUpdated.addListener((tabId) => reapply(tabId));
  chrome.tabs.onActivated.addListener(({ tabId }) => reapply(tabId));
  chrome.windows.onFocusChanged.addListener(() => reapply());
}

/** デバッグ用: 現在値を取得 */
export function getBadgeCount() { return CURRENT; }
