import ShareDB from 'sharedb'

import { InferModel } from 'drizzle-orm'

import { schema } from '@allmaps/db/schema'

import type { Callback } from '@allmaps/api-shared/types'
import type { Operation, PostgresContext } from '@allmaps/db'

const DB = ShareDB.DB

type OpsRow = InferModel<typeof schema.ops>

function parseJsonColumn<T>(value: unknown): T {
  if (typeof value === 'string') {
    return JSON.parse(value) as T
  }

  return value as T
}

export default class PostgresDB extends DB {
  sqlClient: PostgresContext['sql']
  db: PostgresContext['db']

  constructor(postgresContext: PostgresContext) {
    super()

    this.sqlClient = postgresContext.sql
    this.db = postgresContext.db
  }

  // Persists an op and snapshot if it is for the next version. Calls back with
  // callback(err, succeeded)
  commit(
    collection: string,
    id: string,
    op: unknown,
    snapshot: ShareDB.Snapshot,
    options: unknown,
    callback: Callback<boolean>
  ) {
    const serializedSnapshotData = JSON.stringify(snapshot.data)
    const serializedOp = JSON.stringify(op)

    /*
     * op: CreateOp {
     *   src: '24545654654646',
     *   seq: 1,
     *   v: 0,
     *   create: { type: 'http://sharejs.org/types/JSONv0', data: { ... } },
     *   m: { ts: 12333456456 } }
     * }
     * snapshot: PostgresSnapshot
     */
    /*
     * This query uses common table expression to upsert the snapshot table
     * (iff the new version is exactly 1 more than the latest table or if
     * the document id does not exists)
     *
     * It will then insert into the ops table if it is exactly 1 more than the
     * latest table or it the first operation and iff the previous insert into
     * the snapshot table is successful.
     *
     * This result of this query the version of the newly inserted operation
     * If either the ops or the snapshot insert fails then 0 rows are returned
     *
     * If 0 zeros are return then the callback must return false
     *
     * Casting is required as postgres thinks that collection and doc_id are
     * not varchar
     */
    const query = this.sqlClient`WITH snapshot_id AS (
        INSERT INTO snapshots (collection, doc_id, doc_type, version, data)
        SELECT ${collection}::varchar collection, ${id}::varchar doc_id, ${snapshot.type} doc_type, ${snapshot.v} v, ${serializedSnapshotData}::jsonb d
        WHERE ${snapshot.v} = (
          SELECT version + 1 v
          FROM snapshots
          WHERE collection = ${collection} AND doc_id = ${id}
          FOR UPDATE
        ) OR NOT EXISTS (
          SELECT 1
          FROM snapshots
          WHERE collection = ${collection} AND doc_id = ${id}
          FOR UPDATE
        )
        ON CONFLICT (collection, doc_id)
        DO UPDATE SET
          version = ${snapshot.v}, data = ${serializedSnapshotData}::jsonb, doc_type = ${snapshot.type}, updated_at = NOW()
        RETURNING version
      )
      INSERT INTO ops (collection, doc_id, version, operation)
      SELECT ${collection}::varchar collection, ${id}::varchar doc_id, ${snapshot.v} v, ${serializedOp}::jsonb operation
      WHERE (
        ${snapshot.v} = (
          SELECT MAX(version) + 1
          FROM ops
          WHERE collection = ${collection} AND doc_id = ${id}
        ) OR NOT EXISTS (
          SELECT 1
          FROM ops
          WHERE collection = ${collection} AND doc_id = ${id}
        )
      ) AND EXISTS (SELECT 1 FROM snapshot_id)
      RETURNING version`

    query
      .then((res) => {
        if (res.length === 0) {
          callback(null, false)
        } else {
          callback(null, true)
        }
      })
      .catch((err) => callback(err))
  }

  // Get the named document from the database. The callback is called with (err,
  // snapshot). A snapshot with a version of zero is returned if the docuemnt
  // has never been created in the database.
  getSnapshot(
    collection: string,
    id: string,
    fields: unknown,
    options: unknown,
    callback: Callback<ShareDB.Snapshot>
  ) {
    const query = this.sqlClient`SELECT version, data, doc_type
      FROM snapshots
      WHERE collection = ${collection} AND doc_id = ${id} LIMIT 1`

    query
      .then((res) => {
        if (res.length) {
          const row = res[0]
          const snapshot: ShareDB.Snapshot = {
            id,
            v: row.version,
            type: row.doc_type,
            data: parseJsonColumn(row.data),
            m: null
          }

          callback(null, snapshot)
        } else {
          const snapshot: ShareDB.Snapshot = {
            id,
            v: 0,
            type: null,
            data: undefined,
            m: null
          }

          callback(null, snapshot)
        }
      })
      .catch((err) => callback(err))
  }

  // Get operations between [from, to) noninclusively. (Ie, the range should
  // contain start but not end).
  //
  // If end is null, this function should return all operations from start onwards.
  //
  // The operations that getOps returns don't need to have a version: field.
  // The version will be inferred from the parameters if it is missing.
  //
  // Callback should be called as callback(error, [list of ops]);
  getOps(
    collection: string,
    id: string,
    from: number,
    to: number,
    options: unknown,
    callback: Callback<Operation[]>
  ) {
    const sql = this.sqlClient

    const query = sql<OpsRow[]>`SELECT version, operation
      FROM ops
      WHERE collection = ${collection} AND doc_id = ${id} AND version > ${from}
      ${to || to === 0 ? sql`AND version <= ${to}` : sql``}
      ORDER BY version`

    query
      .then((res) => {
        callback(
          null,
          res.map((row) => parseJsonColumn<Operation>(row.operation))
        )
      })
      .catch((err) => callback(err))
  }
}
