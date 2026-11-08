/**
 * `server-only` の代替。
 *
 * `server-only` は Next.js のバンドラが解決する仮想モジュールで、
 * Node から直接 require できない。Vitest では空のモジュールに差し替える。
 * 差し替えは vitest.config.ts の resolve.alias で行う。
 */
export {};
