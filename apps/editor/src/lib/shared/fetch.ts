import { FetchError } from '$lib/shared/errors.js'

const CHECK_DNS_TIMEOUT = 500

function checkProtocol(url: URL) {
  if (url.protocol === 'https:') {
    return true
  } else if (url.protocol === 'http:') {
    throw new FetchError(url.toString(), {
      type: 'INVALID_PROTOCOL',
      protocol: url.protocol
    })
  } else {
    throw new FetchError(url.toString(), {
      type: 'INVALID_PROTOCOL',
      protocol: url.protocol
    })
  }
}

export async function superFetch(url: string, init?: RequestInit) {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  } catch {
    throw new FetchError(url, {
      type: 'INVALID_URL'
    })
  }

  checkProtocol(parsedUrl)

  let response: Response

  try {
    response = await fetch(url, init)
  } catch {
    const domainValid = await checkDns(parsedUrl)

    if (domainValid === 'invalid') {
      throw new FetchError(url, {
        type: 'INVALID_DOMAIN',
        domain: parsedUrl.hostname
      })
    }

    throw new FetchError(url, { type: 'MAYBE_CORS' })
  }

  if (!response.ok) {
    throw new FetchError(url, { type: 'STATUS_CODE', status: response.status })
  }

  try {
    const data = await response.json()
    return data
  } catch {
    throw new FetchError(url, { type: 'INVALID_JSON' })
  }
}

async function checkDns(url: URL, init?: RequestInit) {
  try {
    const checkDnsUrl = `https://dns.google/resolve?name=${url.hostname}`

    const timeoutSignal = AbortSignal.timeout(CHECK_DNS_TIMEOUT)
    const signal = init?.signal
      ? AbortSignal.any([timeoutSignal, init?.signal])
      : timeoutSignal

    const response = await fetch(checkDnsUrl, {
      ...init,
      signal
    })
    const data = await response.json()

    if (data.Status === 0) {
      return 'valid'
    } else {
      return 'invalid'
    }
  } catch {
    return 'unknown'
  }
}
