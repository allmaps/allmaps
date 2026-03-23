import ShareDB from 'sharedb'
import WebSocketJSONStream from '@teamwork/websocket-json-stream'
import json1 from 'ot-json1'
import jsondiff from 'json0-ot-diff'
import diffMatchPatch from 'diff-match-patch'
import { groupBy } from 'ramda'
import { debounce } from 'lodash-es'

import { sql, eq, and } from 'drizzle-orm'

import { generateId, generateChecksum } from '@allmaps/id'
import { polygonToGeojsonPolygon } from '@allmaps/stdlib'
import { ProjectedGcpTransformer } from '@allmaps/project'
import { schema } from '@allmaps/db/schema'
import { dbMapToDbMap3, getCompleteGcps, toDbMap3 } from '@allmaps/api-shared'
import {
  getProjectionsByDbId,
  getProjectionByDbId
} from '@allmaps/api-shared/projections'

import { isGcpsValid, isResourceMaskValid } from '../shared/validate.js'
import ShareDbPostgresDb from './postgres.js'

import { DbMapsSchema } from '@allmaps/db/maps'

import type { Polygon } from 'geojson'
import type { WebSocket } from 'ws'
import type { Connection } from 'sharedb/lib/client'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { DebouncedFunc } from 'lodash-es'

import type { DbMaps, DbMaps3, PostgresContext } from '@allmaps/db'
import type { Callback } from '@allmaps/api-shared/types'

ShareDB.types.register(json1.type)

const projectionsByDbId = getProjectionsByDbId()

type PersistEntry = {
  debouncedPersist: DebouncedFunc<() => Promise<void>>
  idleTimer: ReturnType<typeof setTimeout>
}

export default class AllmapsShareDB {
  db: PostgresContext['db']
  shareDb: ShareDB
  connection: Connection
  latestSnapshotByImageId = new Map<string, ShareDB.Snapshot>()
  persistEntries = new Map<string, PersistEntry>()
  commitsReceived = 0
  persistExecutions = 0
  persistErrors = 0

  // - SNAPSHOT_DEBOUNCE_MS: how long to wait after the latest commit before persisting.
  //     - New commits reset this timer.
  //     - Effect: collapses rapid bursts into one write at the end.
  // - SNAPSHOT_MAX_WAIT_MS: upper bound during continuous edits.
  //     - Even if commits keep coming (so debounce keeps resetting), a persist is forced at least once every MAX_WAIT_MS.
  //     - Effect: limits data-loss window and ensures periodic durability.
  // - SNAPSHOT_IDLE_TTL_MS: how long an image’s debounce entry stays in memory after inactivity.
  //     - When it expires, code flushes pending work, cancels the debouncer, and removes map entries.
  //     - Effect: bounds memory usage and cleans up stale per-image state.

  readonly SNAPSHOT_DEBOUNCE_MS = 5 /* seconds */ * 1000
  readonly SNAPSHOT_MAX_WAIT_MS = 10 /* seconds */ * 1000
  readonly SNAPSHOT_IDLE_TTL_MS = 2 /* minutes */ * 60 * 1000

  constructor(postgresContext: PostgresContext) {
    this.db = postgresContext.db

    const shareDbPostgresDb = new ShareDbPostgresDb(postgresContext)

    this.shareDb = new ShareDB({ db: shareDbPostgresDb })
    this.connection = this.shareDb.connect()

    this.shareDb.use(
      'commit',
      (context: ShareDB.middleware.CommitContext, callback: Callback<never>) =>
        this.onCommit(context.snapshot, callback)
    )
  }

  private onCommit(
    snapshot: ShareDB.Snapshot | null,
    callback: Callback<never>
  ) {
    console.log(
      'Received ShareDB commit for document',
      snapshot ? snapshot.id : null
    )
    if (!snapshot) {
      callback()
      return
    }

    this.commitsReceived += 1
    this.latestSnapshotByImageId.set(snapshot.id, snapshot)

    const persistEntry = this.getOrCreatePersistEntry(snapshot.id)
    persistEntry.debouncedPersist()

    this.logSnapshotMetrics()

    callback()
  }

  private getOrCreatePersistEntry(imageId: string) {
    let persistEntry = this.persistEntries.get(imageId)

    if (!persistEntry) {
      const debouncedPersist = debounce(
        async () => {
          const latestSnapshot = this.latestSnapshotByImageId.get(imageId)

          if (!latestSnapshot) {
            return
          }

          try {
            await this.processSnapshot(latestSnapshot)
            this.persistExecutions += 1
          } catch (err) {
            this.persistErrors += 1
            console.error(
              'Failed to persist debounced ShareDB snapshot for document',
              imageId,
              err
            )
          }
        },
        this.SNAPSHOT_DEBOUNCE_MS,
        {
          trailing: true,
          leading: false,
          maxWait: this.SNAPSHOT_MAX_WAIT_MS
        }
      )

      persistEntry = {
        debouncedPersist,
        idleTimer: setTimeout(() => {
          void this.cleanupPersistEntry(imageId)
        }, this.SNAPSHOT_IDLE_TTL_MS)
      }
      this.persistEntries.set(imageId, persistEntry)
    }

    this.resetIdleTimer(imageId, persistEntry)

    return persistEntry
  }

  private resetIdleTimer(imageId: string, persistEntry: PersistEntry) {
    clearTimeout(persistEntry.idleTimer)
    persistEntry.idleTimer = setTimeout(() => {
      void this.cleanupPersistEntry(imageId)
    }, this.SNAPSHOT_IDLE_TTL_MS)
  }

  private async cleanupPersistEntry(imageId: string) {
    const persistEntry = this.persistEntries.get(imageId)

    if (!persistEntry) {
      return
    }

    clearTimeout(persistEntry.idleTimer)

    try {
      await Promise.resolve(persistEntry.debouncedPersist.flush())
    } catch (err) {
      this.persistErrors += 1
      console.error(
        'Failed to flush debounced snapshot for document',
        imageId,
        err
      )
    }

    persistEntry.debouncedPersist.cancel()
    this.persistEntries.delete(imageId)
    this.latestSnapshotByImageId.delete(imageId)
  }

  async flushPendingSnapshots() {
    const imageIds = [...this.persistEntries.keys()]
    await Promise.all(
      imageIds.map((imageId) => this.cleanupPersistEntry(imageId))
    )

    this.logSnapshotMetrics(true)
  }

  async close() {
    await this.flushPendingSnapshots()

    await new Promise<void>((resolve, reject) => {
      this.shareDb.close((err) => {
        if (err) {
          reject(err)
          return
        }

        resolve()
      })
    })
  }

  private logSnapshotMetrics(force = false) {
    if (!force && this.commitsReceived % 100 !== 0) {
      return
    }

    console.log('ShareDB snapshot persistence metrics', {
      commitsReceived: this.commitsReceived,
      persistExecutions: this.persistExecutions,
      persistErrors: this.persistErrors,
      activeDebouncers: this.persistEntries.size
    })
  }

  private async processSnapshot(snapshot: ShareDB.Snapshot | null) {
    if (!snapshot) {
      return
    }

    console.log('Processing ShareDB snapshot for document', snapshot.id)

    const maps = snapshot.data

    let dbMaps: DbMaps
    try {
      dbMaps = DbMapsSchema.parse(maps)
    } catch {
      return
    }

    if (!Object.keys(dbMaps).length) {
      return
    }

    const dbMaps3 = Object.values(dbMaps).map((map) => dbMapToDbMap3(map))
    const firstDbMap3 = dbMaps3[0]

    // TODO: update database schema - then this is not needed
    const resourceWidth = firstDbMap3.resource.width || 0
    const resourceHeight = firstDbMap3.resource.height || 0

    const imageId = snapshot.id
    const version = snapshot.v

    const imageChecksum = await generateChecksum(maps)

    await this.db.transaction(async (tx) => {
      // First, ensure that the image exists
      await tx
        .insert(schema.images)
        .values({
          id: imageId,
          uri: firstDbMap3.resource.uri,
          width: resourceWidth,
          height: resourceHeight
        })
        .onConflictDoNothing()

      // Then, set latest = false for all maps with imageId
      await tx
        .update(schema.maps)
        .set({ latest: false })
        .where(
          and(eq(schema.maps.imageId, imageId), eq(schema.maps.latest, true))
        )

      // Then, insert new maps
      for (const map of dbMaps3) {
        const checksum = await generateChecksum(map)

        const mapId = map.id

        const resourceMask = [...map.resourceMask, map.resourceMask[0]]

        let geoMask: Polygon | null = null

        const gcpsValid = isGcpsValid(map)
        const resourceMaskValid = isResourceMaskValid(map)

        const gcps = getCompleteGcps(map)

        if (gcpsValid && resourceMaskValid) {
          try {
            const projectedTransformer = new ProjectedGcpTransformer(
              gcps,
              map.transformation,
              // TODO: make sure the ProjectedGcpTransformer constructor also works when
              // map.resourceCrs is undefined
              map.resourceCrs
                ? {
                    internalProjection: getProjectionByDbId(
                      projectionsByDbId,
                      map.resourceCrs.id
                    ),
                    projection: { definition: 'EPSG:4326' }
                  }
                : {
                    internalProjection: { definition: 'EPSG:3857' },
                    projection: { definition: 'EPSG:4326' }
                  }
            )
            geoMask = polygonToGeojsonPolygon(
              projectedTransformer.transformToGeo([resourceMask])
            )
          } catch (err) {
            // This is fine! It just means that the polygon is not valid,
            // a map without a geometry is still inserted
            console.error('Failed to transform resource mask to geo mask', err)
          }
        }

        const wktResourceMask = resourceMaskValid
          ? `POLYGON((${resourceMask.map((p) => `${p[0]} ${p[1]}`).join(',')}))`
          : null

        const resourceMaskSql = wktResourceMask
          ? sql`ST_PolygonFromText(${wktResourceMask})`
          : null
        const geoMaskSql = geoMask
          ? sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(
              geoMask
            )}), 4326)`
          : null

        await tx
          .insert(schema.maps)
          .values({
            id: mapId,
            imageId,
            map,
            version,
            checksum,
            imageChecksum,
            resourceMask: resourceMaskSql,
            geoMask: geoMaskSql
          })
          .onConflictDoUpdate({
            target: [
              schema.maps.id,
              schema.maps.imageId,
              schema.maps.checksum,
              schema.maps.version
            ],
            set: {
              updatedAt: sql`NOW()`,
              latest: true,
              imageChecksum,
              checksum,
              resourceMask: resourceMaskSql,
              geoMask: geoMaskSql
            }
          })
      }
    })
  }

  onWebSocketConnection(ws: WebSocket) {
    const stream = new WebSocketJSONStream(ws)
    this.shareDb.listen(stream)
  }

  private saveDoc(imageId: string, dbMaps: DbMaps3) {
    return new Promise((resolve, reject) => {
      const doc = this.connection.get('images', imageId)
      doc.on('error', reject)

      doc.fetch(() => {
        console.log('Received image from ShareDB:', imageId)
        if (!doc.type) {
          doc.create({}, json1.type.name)
        }

        const ops = jsondiff(doc.data, dbMaps, diffMatchPatch, json1)
        if (ops && ops.length > 0) {
          console.log(`   Submitting ${ops.length} operations`)
          doc.submitOp(ops)
        } else {
          console.log('   Nothing to do...')
        }
        doc.destroy(resolve)
      })
    })
  }

  async saveMaps(maps: GeoreferencedMap[]) {
    // For now, always overwrite all maps for image,
    // generate random ID for each map.
    const result = []

    const mapsByImageUri = groupBy((map) => map.resource.id, maps)

    for (const [imageUri, mapsForImageUri] of Object.entries(mapsByImageUri)) {
      if (mapsForImageUri) {
        // TODO: do we need to fetch imageUri and see if ID in info.json corresponds?
        const imageId = await generateId(imageUri)
        const dbMaps: DbMaps3 = {}
        for (const map of mapsForImageUri) {
          const dbMap = await toDbMap3({ ...map, id: undefined })
          dbMaps[dbMap.id] = dbMap
        }

        const responseImage = {
          imageUri,
          imageId,
          mapIds: Object.values(dbMaps).map((map) => map.id)
        }

        // TODO: update database schema - then this is not needed
        const resourceWidth = mapsForImageUri[0].resource.width || 0
        const resourceHeight = mapsForImageUri[0].resource.height || 0

        // Insert empty image if it doesn't exist
        await this.db
          .insert(schema.images)
          .values({
            id: imageId,
            uri: imageUri,
            width: resourceWidth,
            height: resourceHeight
          })
          .onConflictDoUpdate({
            target: schema.images.id,
            set: {
              updatedAt: sql`NOW()`
            }
          })

        await this.saveDoc(imageId, dbMaps)
        result.push(responseImage)
      }
    }

    return result
  }

  async updateMap(mapId: string, map: GeoreferencedMap) {
    // TODO: check map.id

    const imageId = await generateId(map.resource.id)

    const newMap = {
      ...map,
      id: mapId
    }

    const dbMap = await toDbMap3(newMap)

    return new Promise((resolve, reject) => {
      const doc = this.connection.get('images', imageId)
      doc.on('error', reject)

      doc.fetch(() => {
        if (!doc.type) {
          throw new Error(`No ShareDB document found for imageId ${imageId}`)
        }

        let dbMaps: DbMaps
        try {
          dbMaps = DbMapsSchema.parse(doc.data)
        } catch {
          throw new Error(`Invalid ShareDB document for imageId ${imageId}`)
        }

        dbMaps[mapId] = dbMap

        const ops = jsondiff(doc.data, dbMaps, diffMatchPatch, json1)
        if (ops && ops.length > 0) {
          console.log(`   Submitting ${ops.length} operations`)
          doc.submitOp(ops)
        } else {
          console.log('   Nothing to do...')
        }
        doc.destroy(() => resolve(newMap))
      })
    })
  }
}
