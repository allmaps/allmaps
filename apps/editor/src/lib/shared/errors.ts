const FetchErrorTypes = {
  INVALID_JSON: 'INVALID_JSON' as const,
  STATUS_CODE: 'STATUS_CODE' as const,
  MAYBE_CORS: 'MAYBE_CORS' as const,
  INVALID_URL: 'INVALID_URL' as const,
  INVALID_PROTOCOL: 'INVALID_PROTOCOL' as const,
  INVALID_DOMAIN: 'INVALID_DOMAIN' as const
}

export type FetchErrorDetailsInvalidJson = {
  type: (typeof FetchErrorTypes)['INVALID_JSON']
}

export type FetchErrorDetailsStatusCode = {
  type: (typeof FetchErrorTypes)['STATUS_CODE']
  status: number
}

export type FetchErrorDetailsMaybeCORS = {
  type: (typeof FetchErrorTypes)['MAYBE_CORS']
}

export type FetchErrorDetailsInvalidUrl = {
  type: (typeof FetchErrorTypes)['INVALID_URL']
}

export type FetchErrorDetailsInvalidProtocol = {
  type: (typeof FetchErrorTypes)['INVALID_PROTOCOL']
  protocol: string
}

export type FetchErrorDetailsInvalidDomain = {
  type: (typeof FetchErrorTypes)['INVALID_DOMAIN']
  domain: string
}

export type FetchErrorDetails =
  | FetchErrorDetailsInvalidJson
  | FetchErrorDetailsStatusCode
  | FetchErrorDetailsMaybeCORS
  | FetchErrorDetailsInvalidUrl
  | FetchErrorDetailsInvalidProtocol
  | FetchErrorDetailsInvalidDomain

export class FetchError extends Error {
  #url: string
  #details: FetchErrorDetails

  static INVALID_DOMAIN = FetchErrorTypes.INVALID_DOMAIN
  static INVALID_JSON = FetchErrorTypes.INVALID_JSON
  static INVALID_PROTOCOL = FetchErrorTypes.INVALID_PROTOCOL
  static INVALID_URL = FetchErrorTypes.INVALID_URL
  static MAYBE_CORS = FetchErrorTypes.MAYBE_CORS
  static STATUS_CODE = FetchErrorTypes.STATUS_CODE

  constructor(url: string, details: FetchErrorDetails) {
    super(`FetchError: ${details.type}`)
    this.#url = url
    this.#details = details

    Object.setPrototypeOf(this, FetchError.prototype)
  }

  get details() {
    return this.#details
  }

  get url() {
    return this.#url
  }
}
