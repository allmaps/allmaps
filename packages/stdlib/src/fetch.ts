type FetchOptions = {
  abortSignal?: AbortSignal
  cache?: Cache
}

export async function fetchUrl(url: string, options: FetchOptions = {}) {
  let response: Response | undefined

  if (options.cache) {
    response = await options.cache.match(url)
  }

  if (!response) {
    response = await fetch(url, {
      signal: options.abortSignal
    })

    if (options.cache) {
      options.cache.put(url, response.clone())
    }
  }

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return response
}

export async function fetchJson(
  url: string,
  options: FetchOptions = {}
): Promise<unknown> {
  const response = await fetchUrl(url, options)
  return await response.json()
}

export async function fetchImageInfo(
  imageUri: string,
  options: FetchOptions = {}
) {
  const json = await fetchJson(`${imageUri}/info.json`, options)
  return json
}

export function fetchImage(
  url: string,
  abortSignal?: AbortSignal
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    let aborted = false

    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', async () => {
      if (!aborted) {
        // image.src errors are not at all descriptive
        // load image again using fetch
        try {
          await fetchUrl(url, { abortSignal })
          throw new Error(
            'Image failed to load by setting Image src but downloaded successfully using fetch'
          )
        } catch (err) {
          reject(err)
        }
      } else {
        reject(new DOMException('Loading image aborted by user', 'AbortError'))
      }
    })

    image.crossOrigin = 'anonymous'
    image.src = url

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        // abort event received from AbortController
        // Set image.src to '' to cancel the fetch
        // https://stackoverflow.com/questions/5278304/how-to-cancel-an-image-from-loading
        aborted = true
        image.src = ''
      })
    }
  })
}
