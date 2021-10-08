import axios from 'axios'

export async function fetchJson (cache, url) {
  // console.log('fetchJson', url)
  let data

  let cached = await cache.get(url)
  try {
    data = JSON.parse(cached.toString())
  } catch (err) {
  }

  if (!data) {
    // console.log('  Not found in cache!')
    const response = await axios(url)
    data = response.data
    // If data is JSON, convert to string, or buffer with Buffer.from
    cache.set(url, JSON.stringify(data))
  } else {
    // console.log('  Found in cache!')
  }

  return data
}

export async function fetchImage (cache, url) {
  // console.log('fetchImage', url)
  let data = await cache.get(url)

  if (!data) {
    // console.log('  Not found in cache!')
    const response = await axios({ url, responseType: 'arraybuffer' })
    data = response.data
    cache.set(url, data)
  } else {
    // console.log('  Found in cache!')
  }

  return data
}
