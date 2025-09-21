(function () {
  const SELECTOR = '[data-testid="stop-button"],[data-testid="composer-stop-button"]';
  const SEND_SELECTOR = '[data-testid="send-button"],[data-testid="composer-send-button"]';
  let was = false;   // 直前の生成状態
  let arm = false;   // 通知許可フラグ
  let timer = null;  // setInterval のID
  let enabled = true;
  let awaiting = false; // 送信済みだが完了待ち

  function gen() { return !!document.querySelector(SELECTOR); }

  function notifyDone() {
    try { chrome.runtime.sendMessage({ type: 'notify', title: 'ChatGPT 返答が完了' }); } catch (_) {}
  }
  function pendingDelta(d) {
    try { chrome.runtime.sendMessage({ type: 'pending', delta: d }); } catch (_) {}
  }

  // --- 送信検知（クリック） ---
  function onSendClick(e) {
    const target = e.target;
    if (!target) return;
    const btn = target.closest?.(SEND_SELECTOR);
    if (!btn) return;
    if (!awaiting) { awaiting = true; pendingDelta(+1); }
  }
  document.addEventListener('click', onSendClick, true);

  // --- 送信検知（Enter キー、IME中は無視） ---
  document.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true')) {
      if (!awaiting) { awaiting = true; pendingDelta(+1); }
    }
  }, true);

  function tick() {
    const now = gen();
    if (now && !was) {
      arm = true;                       // 生成開始
      if (!awaiting) { awaiting = true; pendingDelta(+1); } // 送信検知漏れのフォールバック
    }
    if (!now && was && arm) {           // 生成完了
      notifyDone();
      if (awaiting) { pendingDelta(-1); awaiting = false; }
      arm = false;
    }
    was = now;
  }

  function start() {
    if (timer) return;
    timer = setInterval(tick, 900);
    was = gen(); arm = false; awaiting = awaiting && was; // 既送信の連携
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer); timer = null; was = false; arm = false;
  }
  function applyEnabled(flag) { enabled = !!flag; if (enabled) start(); else stop(); }

  // 初期化
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => applyEnabled(enabled));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'enabled' in changes) applyEnabled(changes.enabled.newValue);
  });

  // probe: バッジ表示（数0なら ON/RDY/OFF をセット）
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'probe') {
      // バッジ更新要求
      chrome.runtime.sendMessage({ type: 'probe-setbadge', enabled, monitoring: !!timer });
      sendResponse({ ok: true, enabled, monitoring: !!timer });
      return true;
    }
    if (msg?.type === 'ping') {
      sendResponse({ ok: true, enabled, monitoring: !!timer });
    }
  });
})();
