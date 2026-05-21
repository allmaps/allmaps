export type QueryResult<T> =
  | {
      data: T
      error: null
    }
  | {
      data: null
      error: unknown
    }

export async function queryResult<T>(
  query: PromiseLike<T>
): Promise<QueryResult<T>> {
  try {
    return {
      data: await query,
      error: null
    }
  } catch (error) {
    return {
      data: null,
      error
    }
  }
}
