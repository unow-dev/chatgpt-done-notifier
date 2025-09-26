import { POLL_MS, WAKE_GAP_MS } from '../shared/constants';
import { genCid, sendWithRetry } from '../shared/util';
import { isGenerating, attachSendDetectors } from './detector';
import { initialState } from './state';
import type { MsgC2B, MsgB2C, ProbeStatusRes } from '../shared/messages';

const state = initialState();
let timer: number | null = null;
let lastBeat = Date.now();

function send(msg: MsgC2B) { chrome.runtime.sendMessage(msg); }

async function addOnce() {
  if (!state.cid) state.cid = genCid();
  await sendWithRetry<MsgC2B>({ type: 'pending-add', cid: state.cid }, 3, 400);
}

async function doneOnce() {
  if (!state.cid) return;
  const cid = state.cid;
  await sendWithRetry<MsgC2B>({ type: 'pending-done', cid }, 3, 400);
  await sendWithRetry<MsgC2B>({ type: 'notify', cid, title: 'ChatGPT 返答が完了' }, 2, 300);
  state.cid = null;
}

function onTickOnce() {
  const now = isGenerating();
  if (now && !state.was) { if (!state.cid) void addOnce(); }
  if (!now && state.was) { void doneOnce(); }
  state.was = now;
}

async function onWake(reason: string) {
  // BGを起床（SW起動）させる
  await sendWithRetry<MsgC2B>({ type: 'ping' }, 1, 150);
  // DOMが安定するまで僅かに待って判定
  setTimeout(async () => {
    if (isGenerating() && !state.cid) { await addOnce(); }
    onTickOnce(); // 状態の取りこぼし回収
  }, 80);
}

function heartbeat() {
  const now = Date.now();
  if (now - lastBeat > WAKE_GAP_MS) { void onWake('gap'); }
  lastBeat = now;
}

// MutationObserver で stop-button の出現/消滅を即検知
function installObserver() {
  const mo = new MutationObserver(() => onTickOnce());
  mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
}

(function init() {
  attachSendDetectors(() => { if (!state.cid) void addOnce(); });
  installObserver();
  if (!timer) timer = setInterval(() => { onTickOnce(); heartbeat(); }, POLL_MS) as unknown as number;

  // 可視化/履歴復帰での Wake
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void onWake('visible');
  });
  window.addEventListener('pageshow', (e) => {
    // bfcache 復帰を含む
    void onWake('pageshow');
  });

  // BG リコンシリエーションへの応答
  chrome.runtime.onMessage.addListener((msg: MsgB2C, _s, sendResponse) => {
    if (msg?.type === 'probe-status') {
      const res: ProbeStatusRes = { generating: isGenerating(), cid: state.cid };
      sendResponse(res); return true;
    }
  });
})();
