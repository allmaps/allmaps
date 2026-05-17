export type SearchParam<T = unknown> = {
  key: string
  default?: T
  hash?: boolean
  toString?: (value: T) => string | undefined
  parse?: (value: string | undefined) => T | undefined
}

export type SearchParams = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in string]: SearchParam<any>
}

// Extract the type T from SearchParam<T>
export type ExtractSearchParamType<T> =
  T extends SearchParam<infer U> ? U : never

export type SearchParamsInput<
  T extends SearchParams,
  K extends keyof T = keyof T
> = {
  [P in K]?: ExtractSearchParamType<T[P]>
}
