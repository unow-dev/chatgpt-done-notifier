// Content → Background
export type MsgC2B =
  | { type: 'pending-add'; cid: string }
  | { type: 'pending-done'; cid: string }
  | { type: 'notify'; cid: string; title?: string; message?: string }
  | { type: 'ping' }; // wake用ノップ

// Background → Content
export type MsgB2C =
  | { type: 'probe-status' };

export type ProbeStatusRes = { generating: boolean; cid: string | null };

// Popup ↔ Background
export type PendingSnapshot = {
  cid: string; tabId: number; windowId: number; url?: string; title?: string; ageMs: number
};
export type MsgPopupToBG =
  | { type: 'get-pending' }
  | { type: 'focus-tab'; tabId: number; windowId?: number }
  | { type: 'pending-remove'; cid: string }
  | { type: 'reconcile-now' }
  | { type: 'prune-now' };
