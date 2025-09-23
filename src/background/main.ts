import type { MsgC2B, MsgB2C, MsgPopupToBG, ProbeStatusRes } from '../shared/messages';
import { queueAdd, queueDone, queueDropByTab, queueLoad, pruneOld, addIfMissing, clearTabAll, getPendingDetailed, queueRemoveByCid } from './queue';
import { createDoneNotification, attachNotificationClick } from './notify';
import { focus } from './focus';

chrome.runtime.onInstalled.addListener(() => { void queueLoad(); pruneSchedule(); });
chrome.runtime.onStartup?.addListener(() => { void queueLoad(); pruneSchedule(); });
attachNotificationClick();

// C2B: ACK 応答
chrome.runtime.onMessage.addListener((msg: MsgC2B | MsgPopupToBG, sender, sendResponse) => {
  const tabId = sender?.tab?.id ?? -1;
  const windowId = sender?.tab?.windowId ?? -1;

  // Content-origin
  if ((msg as MsgC2B)?.type === 'pending-add') { queueAdd({ cid: (msg as any).cid, tabId, windowId, url: sender?.tab?.url, sentAt: Date.now() }); sendResponse?.({ ok: true }); return; }
  if ((msg as MsgC2B)?.type === 'pending-done') { queueDone((msg as any).cid); sendResponse?.({ ok: true }); return; }
  if ((msg as MsgC2B)?.type === 'notify') { createDoneNotification(tabId, windowId, (msg as any).cid, (msg as any).title, (msg as any).message); sendResponse?.({ ok: true }); return; }

  // Popup-origin
  const m = msg as MsgPopupToBG;
  switch (m?.type) {
    case 'get-pending':
      getPendingDetailed().then(list => sendResponse({ ok: true, list })); return true;
    case 'focus-tab':
      focus(m.windowId, m.tabId).then(() => sendResponse({ ok: true })); return true;
    case 'pending-remove':
      queueRemoveByCid(m.cid); sendResponse?.({ ok: true }); return;
    case 'reconcile-now':
      reconcileAll(); sendResponse?.({ ok: true }); return;
    case 'prune-now':
      pruneOld(); sendResponse?.({ ok: true }); return;
    default: return;
  }
});

// === リコンシリエーション ===
function reconcileTab(tabId: number) {
  const req: MsgB2C = { type: 'probe-status' };
  chrome.tabs.sendMessage(tabId, req, (res?: ProbeStatusRes) => {
    if (chrome.runtime.lastError) return;
    if (!res) return;
    if (res.generating && res.cid) {
      chrome.tabs.get(tabId, (t) => addIfMissing(tabId, t?.windowId ?? -1, res.cid!));
    } else {
      clearTabAll(tabId);
    }
  });
}
function reconcileAll() {
  chrome.tabs.query({ url: ['https://chat.openai.com/*', 'https://chatgpt.com/*'] }, (tabs) => {
    tabs.forEach(t => t.id && reconcileTab(t.id));
  });
}
(globalThis as any).reconcileAll = reconcileAll; // Popupから呼べるよう公開
(globalThis as any).pruneOld = pruneOld;

function pruneSchedule() {
  try {
    chrome.alarms.create('prune', { periodInMinutes: 15 });
    chrome.alarms.create('reconcile', { periodInMinutes: 1 });
  } catch {}
}
chrome.alarms?.onAlarm.addListener((a) => {
  if (a.name === 'prune') pruneOld();
  if (a.name === 'reconcile') reconcileAll();
});

// タブ閉鎖で掃除
chrome.tabs.onRemoved.addListener((tid) => queueDropByTab(tid));
