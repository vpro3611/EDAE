// Zero-dependency token bridge.
// The store writes here; the private axios client reads here.
// This breaks the client → store → api → client circular import.

let _token: string | null = null
let _refreshFn: (() => Promise<boolean>) | null = null

export function syncToken(token: string | null): void {
  _token = token
}

export function syncRefreshFn(fn: () => Promise<boolean>): void {
  _refreshFn = fn
}

export function getToken(): string | null {
  return _token
}

export async function callRefresh(): Promise<boolean> {
  return _refreshFn?.() ?? false
}
