import { generateRandomId } from '@allmaps/id/sync'

import { ResponseError } from './errors.js'

export async function queryRandom<T>(
  limit: number,
  queryFn: (op: 'gt' | 'lte', randomId: string, limit: number) => Promise<T[]>,
  notFoundMessage = 'Not found'
): Promise<T[]> {
  const randomId = generateRandomId()

  const rowsAfterRandomId = await queryFn('gt', randomId, limit)
  const remainingLimit = limit - rowsAfterRandomId.length
  const rowsBeforeRandomId =
    remainingLimit > 0 ? await queryFn('lte', randomId, remainingLimit) : []
  const rows = [...rowsAfterRandomId, ...rowsBeforeRandomId]

  if (rows.length === 0) {
    throw new ResponseError(notFoundMessage, 404)
  }

  return rows
}
