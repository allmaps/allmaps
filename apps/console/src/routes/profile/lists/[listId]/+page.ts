import type { PageLoad } from './$types'

type List = {
  name?: string
  label?: string | null
}

export const load: PageLoad = async ({ params, fetch, parent }) => {
  const { env } = await parent()

  const r = await fetch(`${env.PUBLIC_REST_BASE_URL}/lists/${params.listId}`, {
    credentials: 'include'
  })
  const list: List | null = r.ok ? await r.json() : null
  return {
    listId: params.listId,
    listName: (list?.label || list?.name) ?? null
  }
}
