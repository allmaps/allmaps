export async function fetchUrl(
  url: string,
  abortSignal?: AbortSignal,
  cache?: Cache
) {
  let response: Response | undefined

  if (cache) {
    response = await cache.match(url)
  }

  if (!response) {
    response = await fetch(url, {
      signal: abortSignal
    })

    if (cache) {
      // TODO: is this needed,
      // cache.put(url, response.clone())
      cache.put(url, response)
    }
  }

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return response
}

export async function fetchJson(
  url: string,
  abortSignal?: AbortSignal,
  cache?: Cache
): Promise<any> {
  const response = await fetchUrl(url, abortSignal, cache)
  return await response.json()
}

export async function fetchImageInfo(
  imageUri: string,
  abortSignal?: AbortSignal,
  cache?: Cache
) {
  const json = await fetchJson(`${imageUri}/info.json`, abortSignal, cache)
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
          await fetchUrl(url, abortSignal)
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
