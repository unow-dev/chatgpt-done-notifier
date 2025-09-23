import { setBadge } from './badge';

export interface PendingItem { cid: string; tabId: number; windowId: number; url?: string; sentAt: number }
const TTL_MS = 2 * 60 * 60 * 1000; // 2h

const store = chrome.storage.session ?? chrome.storage.local;
let PENDING: PendingItem[] = [];

export async function queueLoad() {
  const obj = await store.get({ pending: [] as PendingItem[] });
  PENDING = Array.isArray(obj.pending) ? obj.pending : [];
  pruneOld();
  setBadge(PENDING.length);
}
export async function queueSave() { await store.set({ pending: PENDING }); }

export function queueAdd(item: PendingItem) {               // 冪等 add
  if (PENDING.some(x => x.cid === item.cid)) return;
  PENDING.push(item);
  setBadge(PENDING.length);
  void queueSave();
}
export function queueDone(cid: string) {                    // 冪等 done
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
export function pruneOld() {
  const now = Date.now(), before = PENDING.length;
  PENDING = PENDING.filter(x => now - x.sentAt < TTL_MS);
  if (PENDING.length !== before) {
    setBadge(PENDING.length);
    void queueSave();
  }
}

// リコンシリエーション用
export function hasCid(cid: string) { return PENDING.some(x => x.cid === cid); }
export function addIfMissing(tabId: number, windowId: number, cid: string) {
  if (!hasCid(cid)) queueAdd({ cid, tabId, windowId, sentAt: Date.now() });
}
export function clearTabAll(tabId: number) { queueDropByTab(tabId); }
