export interface CycleState {
  was: boolean;      // 直前の生成状態
  cid: string | null;// 現在の生成サイクルID（未開始はnull）
}

export function initialState(): CycleState {
  return { was: false, cid: null };
}
