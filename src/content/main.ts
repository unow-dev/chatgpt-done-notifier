import { POLL_MS } from '../shared/constants';
import { genCid, sendWithRetry } from '../shared/util';
import { isGenerating, attachSendDetectors } from './detector';
import { initialState } from './state';
import type { MsgC2B, MsgB2C, ProbeStatusRes } from '../shared/messages';

const state = initialState();
let timer: number | null = null;

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

function onTick() {
  const now = isGenerating();
  if (now && !state.was) { if (!state.cid) void addOnce(); }
  if (!now && state.was) { void doneOnce(); }
  state.was = now;
}

(function init() {
  attachSendDetectors(() => { if (!state.cid) void addOnce(); });
  if (!timer) timer = setInterval(onTick, POLL_MS) as unknown as number;

  // probe-status への応答（BGのリコンシリエーション）
  chrome.runtime.onMessage.addListener((msg: MsgB2C, _sender, sendResponse) => {
    if (msg?.type === 'probe-status') {
      const res: ProbeStatusRes = { generating: isGenerating(), cid: state.cid };
      sendResponse(res); return true;
    }
  });
})();
