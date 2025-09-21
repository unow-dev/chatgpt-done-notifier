import { SELECTOR_STOP, SELECTOR_SEND } from '../shared/constants';

export const isGenerating = (): boolean => !!document.querySelector(SELECTOR_STOP);

export function attachSendDetectors(onSend: () => void) {
  // クリック
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest?.(SELECTOR_SEND as any);
    if (btn) onSend();
  }, true);

  // Enter キー（IME中は除外）
  document.addEventListener('keydown', (e) => {
    if ((e as any).isComposing) return;
    if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    const a = document.activeElement as HTMLElement | null;
    if (!a) return;
    if (a.tagName === 'TEXTAREA' || a.getAttribute('contenteditable') === 'true') onSend();
  }, true);
}
