import { BADGE_COLOR } from '../shared/constants';

let CURRENT = 0;
let pendingTimer: number | null = null;

function applyToAllTabs(text: string) {
  chrome.tabs.query({}, (tabs) => {
    for (const t of tabs) {
      if (t.id != null) {
        chrome.action.setBadgeText({ tabId: t.id, text });
        if (text) chrome.action.setBadgeBackgroundColor({ tabId: t.id, color: BADGE_COLOR });
      }
    }
  });
}

function doUpdate() {
  const text = CURRENT > 0 ? String(CURRENT) : '';
  // デフォルト（将来作られるタブ/ウィンドウにも効かせる）
  chrome.action.setBadgeText({ text });
  if (text) chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  // 既存すべてのタブへも適用（局所オーバーライド対策）
  applyToAllTabs(text);
}

/** バッジ数をセット（デバウンスして全タブへ反映） */
export function setBadgeCount(n: number) {
  CURRENT = Math.max(0, n|0);
  if (pendingTimer) clearTimeout(pendingTimer as unknown as number);
  pendingTimer = setTimeout(() => { pendingTimer = null; doUpdate(); }, 0) as unknown as number;
}

/** タブ/ウィンドウのライフサイクルに追従して再適用 */
export function initBadgeWiring() {
  const reapplyActive = (tabId?: number) => {
    const text = CURRENT > 0 ? String(CURRENT) : '';
    if (tabId != null) {
      chrome.action.setBadgeText({ tabId, text });
      if (text) chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
    } else {
      doUpdate();
    }
  };

  chrome.tabs.onCreated.addListener((t) => reapplyActive(t.id!));
  chrome.tabs.onUpdated.addListener((tabId, _info, _tab) => reapplyActive(tabId));
  chrome.tabs.onActivated.addListener(({ tabId }) => reapplyActive(tabId));
  chrome.windows.onFocusChanged.addListener((_wid) => reapplyActive());
}

/** 現在のバッジ数（デバッグ用途） */
export function getBadgeCount() { return CURRENT; }
