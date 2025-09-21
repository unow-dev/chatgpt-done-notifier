// Content → Background
export type MsgC2B =
  | { type: 'pending-add'; cid: string }
  | { type: 'pending-done'; cid: string }
  | { type: 'notify'; cid: string; title?: string; message?: string };

// Background → Content（現状未使用だが拡張余地を残す）
export type MsgB2C =
  | { type: 'probe' };
