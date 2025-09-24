import type { MsgPopupToBG, PendingSnapshot } from '../shared/messages';
import { loadConfig } from '../shared/config';

function send<T extends MsgPopupToBG, R = any>(msg: T): Promise<R> {
  return new Promise((res) => chrome.runtime.sendMessage(msg, (x) => res(x)));
}
function fmtAge(ms: number){
  const s = Math.floor(ms/1000); if (s < 60) return s + 's';
  const m = Math.floor(s/60); if (m < 60) return m + 'm';
  const h = Math.floor(m/60); return h + 'h';
}

async function refresh(){
  const tbody = document.getElementById('rows')!;
  tbody.innerHTML = '<tr><td colspan="6" class="muted">読み込み中…</td></tr>';
  const res = await send<{type:'get-pending'}, {ok:boolean; list: PendingSnapshot[]}>({ type: 'get-pending' });
  const list = (res && res.list) || [];
  if (!list.length){ tbody.innerHTML = '<tr><td colspan="6" class="muted">完了待ちはありません</td></tr>'; return; }
  tbody.innerHTML = list.map((x, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${x.tabId}</td>
      <td>${x.title ? `<div>${x.title}</div>` : ''}${x.url ? `<div><a class="url" href="${x.url}" target="_blank" rel="noreferrer">${x.url}</a></div>` : '<span class="muted">(no url)</span>'}</td>
      <td>${fmtAge(x.ageMs)}</td>
      <td class="cid">${x.cid}</td>
      <td>
        <button data-act="focus" data-tab="${x.tabId}" data-win="${x.windowId}">Focus</button>
        <button data-act="remove" data-cid="${x.cid}" class="danger">Remove</button>
      </td>
    </tr>`).join('');
}

function onClick(e: Event){
  const t = e.target as HTMLElement; if (!t || t.tagName !== 'BUTTON') return;
  const act = t.getAttribute('data-act');
  if (act === 'focus'){
    const tabId = Number(t.getAttribute('data-tab')); const windowId = Number(t.getAttribute('data-win'));
    send({ type: 'focus-tab', tabId, windowId });
  } else if (act === 'remove'){
    const cid = String(t.getAttribute('data-cid'));
    send({ type: 'pending-remove', cid }).then(refresh);
  }
}

async function initToolbar(){
  const toolbar = document.getElementById('toolbar') as HTMLElement;
  const cfg = await loadConfig();
  if (cfg.debug) {
    toolbar.style.display = 'flex'; // 表示
    (document.getElementById('refresh')!).addEventListener('click', refresh);
    (document.getElementById('reconcile')!).addEventListener('click', () => send({ type: 'reconcile-now' }).then(refresh));
    (document.getElementById('prune')!).addEventListener('click', () => send({ type: 'prune-now' }).then(refresh));
  } else {
    toolbar.style.display = 'none';  // 非表示（デフォルト）
  }
}

(function init(){
  document.getElementById('rows')!.addEventListener('click', onClick);
  void initToolbar();
  void refresh();
})();
