(function () {
  const SELECTOR =
    '[data-testid="stop-button"],[data-testid="composer-stop-button"]';
  const SEND_SELECTOR =
    '[data-testid="send-button"],[data-testid="composer-send-button"]';

  let was = false; // 直前の生成状態
  let recorded = false; // この生成サイクルで pending-add を送ったか
  let timer = null;
  let enabled = true;

  const gen = () => !!document.querySelector(SELECTOR);

  // --- 送信トリガー（クリック） ---
  document.addEventListener(
    'click',
    e => {
      const btn = e.target?.closest?.(SEND_SELECTOR);
      if (!btn) return;
      chrome.runtime.sendMessage({ type: 'pending-add' });
      recorded = true;
    },
    true,
  );

  // --- 送信トリガー（Enter; IME中は除外） ---
  document.addEventListener(
    'keydown',
    e => {
      if (e.isComposing) return;
      if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey)
        return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'TEXTAREA' ||
          active.getAttribute('contenteditable') === 'true')
      ) {
        chrome.runtime.sendMessage({ type: 'pending-add' });
        recorded = true;
      }
    },
    true,
  );

  function notifyDone() {
    chrome.runtime.sendMessage({ type: 'notify', title: 'ChatGPT 返答が完了' });
  }

  // --- ポーリングで生成状態を監視（フォールバック含む） ---
  function tick() {
    const now = gen();
    if (now && !was) {
      // 生成開始。送信検知を取りこぼした場合のみカウント追加。
      if (!recorded) {
        chrome.runtime.sendMessage({ type: 'pending-add' });
        recorded = true;
      }
    }
    if (!now && was) {
      // 生成完了
      chrome.runtime.sendMessage({ type: 'pending-done' });
      notifyDone();
      recorded = false;
    }
    was = now;
  }

  function start() {
    if (timer) return;
    timer = setInterval(tick, 900);
    was = gen();
    recorded = false;
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    was = false;
    recorded = false;
  }
  function applyEnabled(flag) {
    enabled = !!flag;
    if (enabled) start();
    else stop();
  }

  chrome.storage.local.get({ enabled: true }, ({ enabled }) =>
    applyEnabled(enabled),
  );
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'enabled' in changes)
      applyEnabled(changes.enabled.newValue);
  });

  // 既存の ping/probe ハンドラは不要。残しても害はないが、バッジは常に数字のみ。
})();
