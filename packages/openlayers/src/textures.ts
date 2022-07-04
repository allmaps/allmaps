async function fetchImage(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return response
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', async () => {
      // image.src errors are not at all descriptive
      // load image again using fetch
      try {
        await fetchImage(url)
        throw new Error('Image failed to load by setting Image src but downloaded successfully using fetch')
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
  })
}
