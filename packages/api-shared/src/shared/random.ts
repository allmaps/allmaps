import { generateRandomId } from '@allmaps/id/sync'

export async function queryRandom<T>(
  queryFn: (op: 'gt' | 'lte', randomId: string) => Promise<T>
): Promise<T> {
  const randomId = generateRandomId()
  try {
    return await queryFn('gt', randomId)
  } catch {
    return await queryFn('lte', randomId)
  }
}
