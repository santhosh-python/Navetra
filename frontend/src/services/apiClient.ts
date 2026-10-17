const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Shared JSON transport. Pages and features should call service modules instead. */
export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.replace(/^\/+/, "");
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}/${normalizedPath}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiRequestError(
      `API request failed with status ${response.status}.`,
      response.status,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiRequestError("API response was not JSON.", response.status);
  }

  return (await response.json()) as T;
}
