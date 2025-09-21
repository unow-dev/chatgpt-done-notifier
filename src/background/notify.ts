import { focus } from './focus';

export function createDoneNotification(tabId: number | undefined, windowId: number | undefined, cid: string, title?: string, message?: string) {
  const nid = `done:cid=${cid}:t=${tabId ?? -1}:w=${windowId ?? -1}:${Date.now()}`;
  chrome.notifications.create(nid, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title ?? 'ChatGPT 返答が完了',
    message: message ?? '応答生成が完了しました',
    priority: 2
  });
}

export function attachNotificationClick() {
  chrome.notifications.onClicked.addListener((id) => {
    const m = /^done:cid=([^:]+):t=(-?\d+):w=(-?\d+):/.exec(id);
    if (!m) { chrome.notifications.clear(id); return; }
    const tabId = parseInt(m[2], 10);
    const windowId = parseInt(m[3], 10);
    focus(windowId, tabId);
    chrome.notifications.clear(id);
  });
}
