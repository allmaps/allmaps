import axios from 'axios'

export async function fetchJson (cache, url) {
  let data

  let cached = await cache.get(url)
  try {
    data = JSON.parse(cached.toString())
  } catch (err) {
  }

  if (!data) {
    const response = await axios(url)
    data = response.data
    cache.set(url, JSON.stringify(data))
  }

  return data
}

export async function fetchImage (cache, url) {
  let data = await cache.get(url)

  if (!data) {
    const response = await axios({ url, responseType: 'arraybuffer' })
    data = response.data
    cache.set(url, data)
  }

  return data
}
