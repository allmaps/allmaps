import { parseIiif }  from '@allmaps/iiif-parser'

export async function get({ url, fetch, params }) {
  console.log(url)
  // const client = createClient(fetch)
  // const { uid } = params
  // const document = await client.getSingle('page', uid)

  if (true) {
    return {
      body: { 'ssss': 2 }
    }
  }
  return {
    status: 404
  }
}
