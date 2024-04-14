export type FetchFn = (
  input: Request | string | URL,
  init?: RequestInit
) => Promise<Response>
