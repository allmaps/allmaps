/* eslint-disable @typescript-eslint/no-explicit-any */

import { setContext, getContext } from 'svelte'

import { SvelteURL } from 'svelte/reactivity'

import { goto } from '$app/navigation'
import { page } from '$app/state'

import type {
  SearchParam,
  SearchParams,
  SearchParamsInput,
  ExtractSearchParamType
} from '$lib/types/params.js'

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
  -readonly [K in keyof T]: T[K] extends { default: infer D }
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
          const paramConfig = this.#searchParams[
            prop as keyof T
          ] as SearchParam<any>

          // Check searchParams first (takes precedence), then hash
          let parsedValue = this.#parseParam(
            this.#url.searchParams,
            prop as keyof T
          )

          // If not in searchParams, check hash
          if (parsedValue === undefined) {
            const hashParams = this.#getHashParams()
            parsedValue = this.#parseParam(hashParams, prop as keyof T)
          }

          // If no value in URL, return default if available
          if (parsedValue === undefined) {
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
          const paramConfig = this.#searchParams[
            prop as keyof T
          ] as SearchParam<any>

          const stringValue = this.#stringifyParam(value, prop as keyof T)

          let defaultStringValue: string | undefined = undefined
          if (this.#searchParams[prop].default) {
            defaultStringValue = this.#stringifyParam(
              this.#searchParams[prop].default,
              prop as keyof T
            )
          }

          // Get current value from URL
          let currentValue: string | null = null
          if (paramConfig.hash) {
            const hashParams = this.#getHashParams()
            currentValue = hashParams.get(paramConfig.key)
          } else {
            currentValue = this.#url.searchParams.get(paramConfig.key)
          }

          const shouldSetValue =
            // stringValue !== undefined &&
            // stringValue !== defaultStringValue &&
            stringValue !== currentValue

          if (paramConfig.hash) {
            // Handle hash params
            const newHashParams = this.#getHashParams()

            if (shouldSetValue) {
              newHashParams.set(paramConfig.key, stringValue!)
            } else {
              newHashParams.delete(paramConfig.key)
            }

            if (shouldSetValue) {
              const hashString = newHashParams.toString()
              const hash = hashString ? `#${hashString}` : ''

              // Navigate to the new URL with hash
              const searchString = this.#url.searchParams.toString()
              const search = searchString ? `?${searchString}` : ''

              goto(`${page.url.pathname}${search}${hash}`, {
                replaceState: false,
                keepFocus: true
              })
            }

            return true
          } else {
            // Handle search params
            const newSearchParams = new URLSearchParams(this.#url.searchParams)

            if (shouldSetValue) {
              newSearchParams.set(paramConfig.key, stringValue!)
            } else {
              newSearchParams.delete(paramConfig.key)
            }

            if (shouldSetValue) {
              const searchString = newSearchParams.toString()
              const search = searchString ? `?${searchString}` : ''
              const hash = this.#url.hash

              goto(`${page.url.pathname}${search}${hash}`, {
                replaceState: false,
                keepFocus: true
              })
            }

            return true
          }
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

  #getHashParams(): URLSearchParams {
    const hash = this.#url.hash
    // Remove leading '#' if present
    const hashQuery = hash.startsWith('#') ? hash.slice(1) : hash
    return new URLSearchParams(hashQuery)
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
   * Only handles search params (not hash params).
   * @param params - Partial object with parameters to update
   * @returns New URLSearchParams object with merged values
   */
  generateSearchParams<K extends keyof T>(
    params: SearchParamsInput<T, K>
  ): URLSearchParams {
    // Start with a copy of current search params
    const newSearchParams = new URLSearchParams(this.#url.searchParams)

    // Update with provided params (only non-hash params)
    for (const key in params) {
      if (key in this.#searchParams) {
        const paramConfig = this.#searchParams[key] as SearchParam<any>

        // Skip hash params
        if (paramConfig.hash) {
          continue
        }

        const value = params[key]
        const stringValue = this.#stringifyParam(value as any, key as keyof T)

        if (stringValue !== undefined && stringValue !== null) {
          newSearchParams.set(paramConfig.key, stringValue)
        } else {
          newSearchParams.delete(paramConfig.key)
        }
      }
    }

    return newSearchParams
  }

  /**
   * Generate hash string by merging provided params with existing ones.
   * Only handles hash params.
   * @param params - Partial object with parameters to update
   * @returns Hash string (including '#') or empty string
   */
  generateHash<K extends keyof T>(params: SearchParamsInput<T, K>): string {
    // Start with a copy of current hash params
    const newHashParams = this.#getHashParams()

    // Update with provided params (only hash params)
    for (const key in params) {
      if (key in this.#searchParams) {
        const paramConfig = this.#searchParams[key] as SearchParam<any>

        // Skip non-hash params
        if (!paramConfig.hash) {
          continue
        }

        const value = params[key]
        const stringValue = this.#stringifyParam(value as any, key as keyof T)

        if (stringValue !== undefined && stringValue !== null) {
          newHashParams.set(paramConfig.key, stringValue)
        } else {
          newHashParams.delete(paramConfig.key)
        }
      }
    }

    const hashString = newHashParams.toString()
    return hashString ? `#${hashString}` : ''
  }

  generateUrl<K extends keyof T>(
    url: string,
    params?: SearchParamsInput<T, K>
  ): string {
    const newSearchParams = this.generateSearchParams(params || {})
    const newHash = this.generateHash(params || {})

    const searchString = newSearchParams.toString()
    const search = searchString ? `?${searchString}` : ''

    return `${url}${search}${newHash}`
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
