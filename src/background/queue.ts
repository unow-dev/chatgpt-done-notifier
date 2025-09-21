import { setBadge } from './badge';

export interface PendingItem { cid: string; tabId: number; windowId: number; url?: string; sentAt: number }

const store = chrome.storage.session ?? chrome.storage.local;
let PENDING: PendingItem[] = [];

export async function queueLoad() {
  const obj = await store.get({ pending: [] as PendingItem[] });
  PENDING = Array.isArray(obj.pending) ? obj.pending : [];
  setBadge(PENDING.length);
}
export async function queueSave() { await store.set({ pending: PENDING }); }

export function queueAdd(item: PendingItem) {
  PENDING.push(item);
  setBadge(PENDING.length);
  void queueSave();
}

export function queueDone(cid: string) {
  const i = PENDING.findIndex(x => x.cid === cid);
  if (i >= 0) {
    PENDING.splice(i, 1);
    setBadge(PENDING.length);
    void queueSave();
  }
}

export function queueDropByTab(tabId: number) {
  const before = PENDING.length;
  PENDING = PENDING.filter(x => x.tabId !== tabId);
  if (PENDING.length !== before) {
    setBadge(PENDING.length);
    void queueSave();
  }
}
