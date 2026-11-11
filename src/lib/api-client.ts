export type ApiLanguage = "th" | "en";
export type FieldErrors = Record<string, string[]>;
export type ApiResponse<T> = { message: string; status: string; status_code: number; data: T };
export type Pagination = { total_records: number; total_pages: number; current_page: number; page_size: number };
export type PaginatedResponse<T> = ApiResponse<T[]> & { pagination: Pagination };
export type ApiErrorResponse = {
  message: string; status: string; status_code: number; error_code: string;
  request_id: string; errors?: FieldErrors;
};

export class ApiError extends Error {
  constructor(
    public readonly response: ApiErrorResponse,
    public readonly httpStatus: number,
    public readonly language: ApiLanguage,
    public readonly retryAfterSeconds?: number,
  ) { super(response.message); this.name = "ApiError"; }
  get errorCode() { return this.response.error_code; }
  get fieldErrors(): FieldErrors { return this.response.errors ?? {}; }
  get requestId() { return this.response.request_id; }
}

const messages = {
  th: {
    network: "เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบเครือข่ายแล้วลองอีกครั้ง",
    invalid: "ระบบตอบกลับไม่ถูกต้อง กรุณาลองอีกครั้ง",
    server: "ระบบขัดข้อง กรุณาลองอีกครั้ง",
    rate: "ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง",
    auth: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
  },
  en: {
    network: "Unable to connect. Check your network and try again.",
    invalid: "Invalid server response. Please try again.",
    server: "The service is unavailable. Please try again.",
    rate: "Too many requests. Please wait before trying again.",
    auth: "Please sign in to continue.",
  },
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function envelope(value: unknown): value is Record<string, unknown> & { message: string; status: string; status_code: number } {
  return object(value) && typeof value.message === "string" && typeof value.status === "string" && Number.isInteger(value.status_code);
}
function fields(value: unknown): FieldErrors | undefined {
  if (!object(value)) return undefined;
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string[]] =>
    Array.isArray(entry[1]) && entry[1].every(item => typeof item === "string")));
}

/** NEXT_PUBLIC values must be set before next build (including Docker builds). */
export function apiBaseUrl(configured?: string): string {
  if (!configured?.trim()) throw new Error("Set NEXT_PUBLIC_API_BASE_URL to the pathology-portal-service origin (local: http://localhost:9100).");
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || !["", "/", "/v1", "/v1/"].includes(url.pathname)) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) origin, optionally ending in /v1, without credentials, query or fragment.");
  }
  return `${url.origin}/v1/`;
}

export type ApiRequestOptions = Omit<RequestInit, "body" | "headers" | "credentials" | "redirect" | "cache"> & {
  body?: unknown;
  headers?: HeadersInit;
  /** Only for endpoints such as login that explicitly permit unauthenticated access. */
  auth?: boolean;
};
type ClientOptions = {
  baseUrl: string;
  getAccessToken: () => string | null | Promise<string | null>;
  getLanguage: () => ApiLanguage;
  fetch?: typeof fetch;
  onUnauthorized?: (rejectedToken: string | null) => Promise<unknown>;
  onAuthenticationFailure?: () => void;
  getSessionGeneration?: () => number;
};

/** On the server, create one client per request; never share a user's token globally. */
export function createApiClient(options: ClientOptions) {
  const base = apiBaseUrl(options.baseUrl);
  async function send<T>(path: string, optionsForRequest: ApiRequestOptions = {}, retried = false): Promise<ApiResponse<T>> {
    // Resolve and validate before reading a token; never send credentials outside /v1.
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path) || path.includes("\\") || path.includes("#")) throw new Error("API paths must be relative to /v1.");
    const relative = path.replace(/^\//, "").replace(/^v1(?:\/|$)/, "");
    const url = new URL(relative, base);
    if (url.origin !== new URL(base).origin || !url.pathname.startsWith("/v1/")) throw new Error("API paths must stay inside /v1.");
    const language = options.getLanguage();
    const localError = (code: string, message: string, status = 0, requestId = "") =>
      new ApiError({ message, status: "error", status_code: status, error_code: code, request_id: requestId }, status, language);
    const { body, headers: customHeaders, auth = true, ...init } = optionsForRequest;
    init.signal?.throwIfAborted();
    const generation = options.getSessionGeneration?.();
    const headers = new Headers(customHeaders);
    headers.set("Accept", "application/json");
    headers.set("Accept-Language", language);
    headers.delete("Authorization");
    let token: string | null = null;
    if (auth) {
      token = await options.getAccessToken();
      if (!token) throw localError("client.auth_required", messages[language].auth);
      headers.set("Authorization", `Bearer ${token}`);
    }
    init.signal?.throwIfAborted();
    const checkSession = () => {
      if (auth && generation !== options.getSessionGeneration?.()) throw localError("client.session_changed", messages[language].auth);
    };
    checkSession();
    let payload: BodyInit | undefined;
    if (body instanceof FormData) { payload = body; headers.delete("Content-Type"); }
    else if (body !== undefined) { payload = JSON.stringify(body); headers.set("Content-Type", "application/json"); }
    let response: Response;
    let value: unknown;
    try {
      response = await (options.fetch ?? fetch)(url.toString(), {
        ...init, method: init.method ?? (body === undefined ? "GET" : "POST"), headers, body: payload,
        credentials: "omit", redirect: "error", cache: "no-store",
      });
      const text = await response.text();
      try { value = JSON.parse(text); } catch { value = null; }
    } catch (error) {
      if (init.signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
      throw localError("client.network_error", messages[language].network);
    }
    checkSession();
    if (response.status === 401 && auth && options.onUnauthorized) {
      if (!retried) {
        await options.onUnauthorized(token);
        init.signal?.throwIfAborted();
        checkSession();
        return send<T>(path, optionsForRequest, true);
      }
      options.onAuthenticationFailure?.();
    }
    if (!response.ok) {
      const valid = envelope(value);
      const errorBody: Record<string, unknown> = envelope(value) ? value : {};
      const fallback = response.status === 429 ? messages[language].rate : messages[language].server;
      const retry = response.headers.get("Retry-After");
      const seconds = retry === null ? undefined : /^\d+$/.test(retry) ? Number(retry) : Math.max(0, Math.ceil((Date.parse(retry) - Date.now()) / 1000));
      throw new ApiError({
        message: valid && errorBody.message ? errorBody.message as string : fallback,
        status: valid ? errorBody.status as string : "error",
        status_code: valid ? errorBody.status_code as number : response.status,
        error_code: typeof errorBody.error_code === "string" ? errorBody.error_code : "client.http_error",
        request_id: typeof errorBody.request_id === "string" ? errorBody.request_id : response.headers.get("X-Request-ID") ?? "",
        errors: fields(errorBody.errors),
      }, response.status, language, Number.isFinite(seconds) ? seconds : undefined);
    }
    if (!envelope(value) || !("data" in value) || value.status_code !== response.status) {
      throw localError("client.invalid_response", messages[language].invalid, response.status, response.headers.get("X-Request-ID") ?? "");
    }
    return value as ApiResponse<T>;
  }
  function request<T>(path: string, init?: ApiRequestOptions) { return send<T>(path, init); }
  async function paginated<T>(path: string, init?: ApiRequestOptions): Promise<PaginatedResponse<T>> {
    const response = await request<T[]>(path, init) as PaginatedResponse<T>;
    const p = response.pagination;
    if (!Array.isArray(response.data) || !object(p) ||
      ![p.total_records, p.total_pages, p.current_page, p.page_size].every(n => Number.isInteger(n) && n >= 0) || p.current_page < 1 || p.page_size < 1) {
      throw new ApiError({ message: messages[options.getLanguage()].invalid, status: "error", status_code: response.status_code, error_code: "client.invalid_response", request_id: "" }, response.status_code, options.getLanguage());
    }
    return response;
  }
  return { request, paginated };
}

/** Preserve backend translations; append diagnostics and rate-limit guidance only. */
export function apiErrorMessage(error: ApiError): string {
  const parts = [error.message];
  if (error.httpStatus === 429) {
    parts.push(messages[error.language].rate);
    if (error.retryAfterSeconds !== undefined) parts.push(error.language === "th" ? `ลองอีกครั้งใน ${error.retryAfterSeconds} วินาที` : `Try again in ${error.retryAfterSeconds} seconds.`);
  }
  if (error.httpStatus >= 500 && error.requestId) parts.push(`Request ID: ${error.requestId}`);
  return [...new Set(parts)].join(" · ");
}
