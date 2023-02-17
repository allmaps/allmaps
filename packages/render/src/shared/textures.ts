import { fetchUrl } from '@allmaps/stdlib'

export function fetchImage(
  url: string,
  abortSignal?: AbortSignal
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', async () => {
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
    })

    image.crossOrigin = 'anonymous'
    image.src = url

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        // abort event received from AbortController
        // Set image.src to '' to cancel the fetch
        // https://stackoverflow.com/questions/5278304/how-to-cancel-an-image-from-loading
        image.src = ''
      })
    }
  })
}
