import type { MsgC2B } from '../shared/messages';
import { queueAdd, queueDone, queueDropByTab, queueLoad } from './queue';
import { createDoneNotification, attachNotificationClick } from './notify';

chrome.runtime.onInstalled.addListener(() => { void queueLoad(); });
chrome.runtime.onStartup?.addListener(() => { void queueLoad(); });
attachNotificationClick();

chrome.runtime.onMessage.addListener((msg: MsgC2B, sender, sendResponse) => {
  const tabId = sender?.tab?.id ?? -1;
  const windowId = sender?.tab?.windowId ?? -1;

  switch (msg.type) {
    case 'pending-add': {
      queueAdd({ cid: msg.cid, tabId, windowId, url: sender?.tab?.url, sentAt: Date.now() });
      sendResponse?.({ ok: true });
      return; // sync
    }
    case 'pending-done': {
      queueDone(msg.cid);
      sendResponse?.({ ok: true });
      return; // sync
    }
    case 'notify': {
      createDoneNotification(tabId, windowId, msg.cid, msg.title, msg.message);
      sendResponse?.({ ok: true });
      return; // sync
    }
    default:
      return; // ignore
  }
});

chrome.tabs.onRemoved.addListener((tid) => queueDropByTab(tid));
