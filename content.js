(function () {
  const SELECTOR = '[data-testid="stop-button"],[data-testid="composer-stop-button"]';
  let was = false;   // 直前の生成状態
  let arm = false;   // 通知許可フラグ（1回の生成サイクルにつき1回）
  let timer = null;  // setInterval のID
  let enabled = true;

  function gen() {
    return !!document.querySelector(SELECTOR);
  }

  function notify() {
    try {
      chrome.runtime.sendMessage({ type: 'notify', title: 'ChatGPT 返答が完了' }, () => {});
    } catch (_) {}
  }

  function tick() {
    const now = gen();
    if (now && !was) arm = true;               // 生成開始
    if (!now && was && arm) {                  // 生成完了
      notify();
      arm = false;
    }
    was = now;
  }

  function start() {
    if (timer) return;
    timer = setInterval(tick, 900);
    // 初期状態の把握
    was = gen();
    arm = false;
    console.debug('[ChatGPT 完了通知] 監視開始');
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    was = false;
    arm = false;
    console.debug('[ChatGPT 完了通知] 監視停止');
  }

  function applyEnabled(flag) {
    enabled = !!flag;
    if (enabled) start(); else stop();
  }

  // 初期化（保存された設定を取得）
  chrome.storage.local.get({ enabled: true }, ({ enabled }) => applyEnabled(enabled));

  // 設定変更を監視
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'enabled' in changes) {
      applyEnabled(changes.enabled.newValue);
    }
  });

  // ポップアップからの疎通確認に応答
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'ping') {
      sendResponse({ ok: true, enabled });
    }
  });
})();
