const $btn = document.getElementById('toggle');

function render(enabled) {
  $btn.textContent = enabled ? '監視: ON' : '監視: OFF';
  $btn.classList.toggle('on', enabled);
}

async function getEnabled() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ enabled: true }, ({ enabled }) => resolve(enabled));
  });
}

async function setEnabled(v) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ enabled: !!v }, () => resolve());
  });
}

(async function init() {
  render(await getEnabled());
  $btn.addEventListener('click', async () => {
    const current = await getEnabled();
    await setEnabled(!current);
    render(!current);

    // アクティブタブのcontent.jsと同期（即時反映用）
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) chrome.tabs.sendMessage(tabId, { type: 'ping' }, () => {});
    });
  });
})();
