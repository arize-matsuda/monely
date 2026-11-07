import type { ActionResult } from "@/lib/types";

/** 項目ごとのエラー文を取り出す */
export function errorFor<T>(
  state: ActionResult<T> | null,
  field: string,
): string | undefined {
  return state?.ok === false && state.error.field === field
    ? state.error.message
    : undefined;
}

/** 項目に紐づかないエラー（通信失敗・認証失敗など） */
export function formErrorOf<T>(
  state: ActionResult<T> | null,
): string | undefined {
  return state?.ok === false && !state.error.field
    ? state.error.message
    : undefined;
}
