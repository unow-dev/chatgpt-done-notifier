export type AppConfig = { debug: boolean };

let cached: AppConfig | null = null;

export async function loadConfig(): Promise<AppConfig> {
  if (cached) return cached;
  try {
    const url = chrome.runtime.getURL('config.json');
    const res = await fetch(url, { cache: 'no-cache' });
    const json = await res.json();
    cached = { debug: !!json.debug };
  } catch {
    cached = { debug: false };
  }
  return cached!;
}
