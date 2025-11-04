import { setContext, getContext } from 'svelte'

import { SvelteURL } from 'svelte/reactivity'

import { goto } from '$app/navigation'
import { page } from '$app/state'

import type {
  SearchParam,
  SearchParams,
  SearchParamsInput,
  ExtractSearchParamType
} from '$lib/types/shared.js'

const URL_KEY = Symbol('url')

// Infer the actual type returned by params getter (handles parse function and defaults)
type InferParamType<T> =
  T extends SearchParam<infer U>
    ? T extends { parse: (...args: any[]) => any }
      ? U
      : string
    : never

// Mapped type for params proxy - handles default values properly
type ParamsProxy<T extends SearchParams> = {
  [K in keyof T]: T[K] extends { default: infer D }
    ? Exclude<ExtractSearchParamType<T[K]>, undefined> | D
    : InferParamType<T[K]> | undefined
}

export class UrlState<T extends SearchParams> {
  #url: SvelteURL

  #searchParams: T

  /**
   * Dynamic access to URL search parameters. Use like: urlState.params.bbox = [1,2,3,4]
   * Automatically parses values on get and stringifies them on set, updating the URL.
   */
  params: ParamsProxy<T>

  constructor(url: URL, params: T) {
    this.#url = new SvelteURL(url)
    this.#searchParams = params

    // Create proxy for dynamic parameter access
    this.params = new Proxy({} as ParamsProxy<T>, {
      get: (target, prop: string | symbol) => {
        if (typeof prop === 'string' && prop in this.#searchParams) {
          const parsedValue = this.#parseParam(
            this.#url.searchParams,
            prop as keyof T
          )

          // If no value in URL, return default if available
          if (parsedValue === undefined) {
            const paramConfig = this.#searchParams[
              prop as keyof T
            ] as SearchParam<any>
            if (paramConfig && 'default' in paramConfig) {
              return paramConfig.default
            }
          }

          return parsedValue
        }
        return undefined
      },
      // TODO: Setting a single parameter triggers updates for all other parameters
      // We might be able to optimize this by using the SvelteURLSearchParams class.
      set: (target, prop: string | symbol, value: any) => {
        if (typeof prop === 'string' && prop in this.#searchParams) {
          const newSearchParams = new URLSearchParams(this.#url.searchParams)

          const stringValue = this.#stringifyParam(value, prop as keyof T)

          const paramConfig = this.#searchParams[
            prop as keyof T
          ] as SearchParam<any>

          let defaultStringValue: string | undefined = undefined
          if (this.#searchParams[prop].default) {
            defaultStringValue = this.#stringifyParam(
              this.#searchParams[prop].default,
              prop as keyof T
            )
          }

          if (stringValue !== undefined && stringValue !== defaultStringValue) {
            newSearchParams.set(paramConfig.key, stringValue)
          } else {
            newSearchParams.delete(paramConfig.key)
          }

          // Navigate to the new URL
          goto(`${page.url.pathname}?${newSearchParams.toString()}`, {
            replaceState: false,
            keepFocus: true
          })

          return true
        }
        return false
      }
    })
  }

  updateUrl(url: URL) {
    if (this.#url.href !== url.href) {
      this.#url.href = url.href
    }
  }

  #parseParam<K extends keyof T>(
    urlSearchParams: URLSearchParams,
    key: K
  ): InferParamType<T[K]> | undefined {
    const param = this.#searchParams[key] as SearchParam<any>
    if (!param) {
      return undefined
    }

    const value = urlSearchParams.get(param.key)
    if (!value) {
      return undefined
    }

    // If param has a parse function, use it
    if (Object.hasOwn(param, 'parse') && param.parse) {
      return param.parse(value)
    }

    // Default behavior: return the string value
    return value as any
  }

  #stringifyParam<K extends keyof T>(
    value: InferParamType<T[K]>,
    key: K
  ): string | undefined {
    const param = this.#searchParams[key] as SearchParam<any>
    if (!param || value === undefined || value === null) {
      return undefined
    }

    // If param has a toString function, use it
    if (Object.hasOwn(param, 'toString') && param.toString) {
      return param.toString(value)
    }

    // Default behavior: use JavaScript's toString
    return String(value)
  }

  /**
   * Parse a URL search parameter value using the configured parser.
   * @param key - The parameter key
   * @param value - The string value to parse
   * @returns The parsed value
   */
  parseParam<K extends keyof T>(
    key: K,
    value: string
  ): InferParamType<T[K]> | undefined {
    const param = this.#searchParams[key] as SearchParam<any>
    if (!param) {
      return undefined
    }

    // If param has a parse function, use it
    if (param.parse) {
      return param.parse(value)
    }

    // Default behavior: return the string value
    return value as any
  }

  /**
   * Stringify a parameter value using the configured stringifier.
   * @param key - The parameter key
   * @param value - The value to stringify
   * @returns The stringified value or undefined
   */
  stringifyParam<K extends keyof T>(
    key: K,
    value: InferParamType<T[K]>
  ): string | undefined {
    return this.#stringifyParam(value, key)
  }

  /**
   * Generate new URLSearchParams by merging provided params with existing ones.
   * @param params - Partial object with parameters to update
   * @returns New URLSearchParams object with merged values
   */
  generateSearchParams<K extends keyof T>(
    params: SearchParamsInput<T, K>
  ): URLSearchParams {
    // Start with a copy of current search params
    const newSearchParams = new URLSearchParams(this.#url.searchParams)

    // Update with provided params
    for (const key in params) {
      if (key in this.#searchParams) {
        const value = params[key]
        const stringValue = this.#stringifyParam(value as any, key as keyof T)
        const paramConfig = this.#searchParams[key] as SearchParam<any>

        if (stringValue !== undefined && stringValue !== null) {
          newSearchParams.set(paramConfig.key, stringValue)
        } else {
          newSearchParams.delete(paramConfig.key)
        }
      }
    }

    return newSearchParams
  }

  generateUrl<K extends keyof T>(
    url: string,
    params?: SearchParamsInput<T, K>
  ): string {
    const newSearchParams = this.generateSearchParams(params || {})
    return `${url}?${newSearchParams.toString()}`
  }
}

export function setUrlState<T extends SearchParams>(url: URL, params: T) {
  return setContext(URL_KEY, new UrlState(url, params))
}

export function getUrlState<T extends SearchParams = SearchParams>() {
  const urlState = getContext<UrlState<T>>(URL_KEY)

  if (!urlState) {
    throw new Error('UrlState is not set')
  }

  return urlState
}
