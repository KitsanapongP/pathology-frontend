import { ApiError, apiErrorMessage } from "@/lib/api-client";

/** Render backend strings directly as React text, never through UI translation or HTML. */
export function ApiErrorNotice({ error }: { error: ApiError | null }) {
  return error ? <p role="alert">{apiErrorMessage(error)}</p> : null;
}

export function ApiFieldErrors({ error, field, id }: { error: ApiError | null; field: string; id: string }) {
  const messages = error?.fieldErrors[field];
  return messages?.length ? <div id={id} role="alert">{messages.map((message, index) => <p key={index}>{message}</p>)}</div> : null;
}
