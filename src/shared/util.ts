export const genCid = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const assertNever = (x: never): never => { throw new Error('Unhandled: ' + String(x)); };

export const withDefault = <T>(v: T | undefined, d: T): T => (v === undefined ? d : v);
