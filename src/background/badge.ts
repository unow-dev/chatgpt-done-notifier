import { BADGE_COLOR } from '../shared/constants';

export function setBadge(n: number) {
  const text = n > 0 ? String(n) : '';
  chrome.action.setBadgeText({ text });
  if (n > 0) chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
}
