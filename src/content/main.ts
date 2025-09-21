import { POLL_MS } from '../shared/constants';
import { genCid } from '../shared/util';
import { isGenerating, attachSendDetectors } from './detector';
import { initialState } from './state';
import type { MsgC2B } from '../shared/messages';

const state = initialState();
let timer: number | null = null;

function send(msg: MsgC2B) { chrome.runtime.sendMessage(msg); }

function ensureAddPending() {
  if (!state.cid) state.cid = genCid();
  send({ type: 'pending-add', cid: state.cid });
}

function onTick() {
  const now = isGenerating();
  if (now && !state.was) {
    if (!state.cid) ensureAddPending();
  }
  if (!now && state.was) {
    if (state.cid) {
      send({ type: 'pending-done', cid: state.cid });
      send({ type: 'notify', cid: state.cid, title: 'ChatGPT 返答が完了' });
      state.cid = null;
    }
  }
  state.was = now;
}

function start() {
  if (timer) return;
  timer = setInterval(onTick, POLL_MS) as unknown as number;
}

(function init() {
  attachSendDetectors(() => {
    if (!state.cid) {
      state.cid = genCid();
      send({ type: 'pending-add', cid: state.cid });
    }
  });
  start();
})();
