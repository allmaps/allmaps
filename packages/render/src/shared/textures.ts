import { fetchUrl } from '@allmaps/stdlib'

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
          let message = 'Unknown Error'

          if (err instanceof Error) {
            message = err.message
          }

          reject(message)
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
