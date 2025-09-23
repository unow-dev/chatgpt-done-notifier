export const genCid = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const assertNever = (x: never): never => {
  throw new Error('Unhandled: ' + String(x));
};

export const withDefault = <T>(v: T | undefined, d: T): T =>
  (v === undefined ? d : v);

/** 返信待ち (timeout付) */
export function sendMessage<TReq, TRes = any>(msg: TReq, timeoutMs = 800): Promise<TRes> {
  return new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) { done = true; reject(new Error('timeout')); }
    }, timeoutMs);
    chrome.runtime.sendMessage(msg, (res) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      resolve(res as TRes);
    });
  });
}

/** 返信待ち + リトライ */
export async function sendWithRetry<TReq, TRes = any>(
  msg: TReq, attempts = 3, baseMs = 500
): Promise<TRes | undefined> {
  for (let i = 0; i < attempts; i++) {
    try { return await sendMessage<TReq, TRes>(msg, baseMs * (i + 1)); } catch {}
  }
  return undefined;
}
