const $btn = document.getElementById('toggle');
function render(enabled) { $btn.textContent = enabled ? '監視: ON' : '監視: OFF'; $btn.classList.toggle('on', enabled); }
async function getEnabled() { return new Promise((r)=> chrome.storage.local.get({ enabled: true }, ({enabled})=> r(enabled))); }
async function setEnabled(v) { return new Promise((r)=> chrome.storage.local.set({ enabled: !!v }, ()=> r())); }
(async function init(){
  render(await getEnabled());
  $btn.addEventListener('click', async () => {
    const current = await getEnabled();
    await setEnabled(!current); render(!current);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id; if (tabId) chrome.tabs.sendMessage(tabId, { type: 'probe' }, ()=>{});
    });
  });
})();
