import type { MsgC2B, MsgB2C, ProbeStatusRes } from '../shared/messages';
import { queueAdd, queueDone, queueDropByTab, queueLoad, pruneOld, addIfMissing, clearTabAll } from './queue';
import { createDoneNotification, attachNotificationClick } from './notify';

chrome.runtime.onInstalled.addListener(() => { void queueLoad(); pruneSchedule(); });
chrome.runtime.onStartup?.addListener(() => { void queueLoad(); pruneSchedule(); });
attachNotificationClick();

// C2B: ACK 応答
chrome.runtime.onMessage.addListener((msg: MsgC2B, sender, sendResponse) => {
  const tabId = sender?.tab?.id ?? -1;
  const windowId = sender?.tab?.windowId ?? -1;
  switch (msg.type) {
    case 'pending-add': queueAdd({ cid: msg.cid, tabId, windowId, url: sender?.tab?.url, sentAt: Date.now() }); sendResponse?.({ ok: true }); return;
    case 'pending-done': queueDone(msg.cid); sendResponse?.({ ok: true }); return;
    case 'notify': createDoneNotification(tabId, windowId, msg.cid, msg.title, msg.message); sendResponse?.({ ok: true }); return;
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

// 安全網：タブ閉鎖で掃除
chrome.tabs.onRemoved.addListener((tid) => queueDropByTab(tid));
