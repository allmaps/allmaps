import { describe, it, expect } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'
import { schema } from '@allmaps/db'
import {
  backfillDailyStatistics,
  refreshDailyStatistics,
  queryStatistics,
  queryStatisticsHistory
} from '@allmaps/api-shared/db'
import { createTestContext } from './helpers/context.ts'

describe('daily domain statistics', () => {
  it('backfills retained events idempotently without inventing stocks or counting versions twice', async () => {
    const context = await createTestContext({ seed: 'map' })
    try {
      const day = '2025-01-01'
      await context.db
        .update(schema.images)
        .set({ createdAt: new Date(`${day}T23:30:00Z`) })
      await context.db
        .update(schema.maps)
        .set({ createdAt: new Date(`${day}T23:45:00Z`) })
      // A later retained version must not count as another new map or image.
      await context.db
        .execute(sql`INSERT INTO maps (id, image_id, checksum, image_checksum, version, latest, archived, created_at, updated_at, data, resource_mask, geo_mask)
        SELECT id, image_id, checksum || '-old', image_checksum, version + 100, false, false,
          '2025-01-02T01:00:00Z'::timestamptz, updated_at, data, resource_mask, geo_mask FROM maps LIMIT 1`)
      await backfillDailyStatistics(context.db, day, '2025-01-03')
      await backfillDailyStatistics(context.db, day, '2025-01-03')
      const history = await queryStatisticsHistory(context.db, {
        from: day,
        through: '2025-01-03',
        interval: 'day'
      })
      expect(history.periods).toHaveLength(3)
      expect(history.periods[0]).toMatchObject({
        imagesAdded: 1,
        mapsAdded: 1,
        imagesFirstGeoreferenced: 1,
        images: null,
        maps: null,
        stockDay: null
      })
      expect(history.periods[1]).toMatchObject({
        imagesAdded: 0,
        mapsAdded: 0,
        imagesFirstGeoreferenced: 0
      })
      for (const interval of ['week', 'month', 'year'] as const) {
        const grouped = await queryStatisticsHistory(context.db, {
          from: day,
          through: '2025-01-03',
          interval
        })
        expect(grouped.periods).toHaveLength(1)
        expect(grouped.periods[0]).toMatchObject({
          imagesAdded: 1,
          mapsAdded: 1,
          imagesFirstGeoreferenced: 1,
          images: null,
          availableDays: 3
        })
      }
      await expect(queryStatistics(context.db)).rejects.toThrow(
        'not been generated'
      )
      await refreshDailyStatistics(context.db)
      const before = await queryStatistics(context.db)
      expect(before).toMatchObject({
        images: 1,
        maps: 1,
        georeferencedImages: 1,
        ungeoreferencedImages: 0,
        source: 'daily'
      })
      const today = before.measuredAt.slice(0, 10)
      await backfillDailyStatistics(context.db, today, today)
      expect(await queryStatistics(context.db)).toEqual(before)
      // Prove reads are detached from source writes until a scheduled refresh.
      await context.db.update(schema.images).set({ archived: true })
      expect(await queryStatistics(context.db)).toEqual(before)
      await refreshDailyStatistics(context.db)
      expect(await queryStatistics(context.db)).toMatchObject({
        images: 0,
        maps: 0,
        georeferencedImages: 0,
        georeferencedPercentage: null
      })
      const [image] = await context.db.select().from(schema.images)
      const [todayRow] = await context.db
        .select()
        .from(schema.statisticsDaily)
        .where(
          and(
            eq(schema.statisticsDaily.domain, image.domain!),
            eq(schema.statisticsDaily.day, today)
          )
        )
      expect(todayRow.images).toBe(0)
      await expect(
        backfillDailyStatistics(context.db, '2025-02-30', day)
      ).rejects.toThrow('valid date')
      await expect(
        queryStatisticsHistory(context.db, {
          from: '2025-01-03',
          through: day,
          interval: 'day'
        })
      ).rejects.toThrow('Start date')
    } finally {
      await context.close()
    }
  })

  it('sums additions but uses the last recorded stock within partial weeks, months and years', async () => {
    const context = await createTestContext()
    try {
      await context.db.insert(schema.statisticsDaily).values([
        {
          domain: 'one.example',
          day: '2025-01-01',
          imagesAdded: 3,
          images: 10,
          maps: 8,
          manifests: 2,
          imagesWithoutManifest: 1,
          georeferencedImages: 5,
          snapshotAt: new Date('2025-01-01T23:00:00Z')
        },
        {
          domain: 'two.example',
          day: '2025-01-01',
          imagesAdded: 1,
          images: 7,
          maps: 4,
          manifests: 2,
          imagesWithoutManifest: 3,
          georeferencedImages: 2,
          snapshotAt: new Date('2025-01-01T23:00:00Z')
        },
        {
          domain: 'one.example',
          day: '2025-01-02',
          imagesAdded: 2,
          images: 12,
          maps: 9,
          manifests: 2,
          imagesWithoutManifest: 1,
          georeferencedImages: 6,
          snapshotAt: new Date('2025-01-02T23:00:00Z')
        },
        {
          domain: 'two.example',
          day: '2025-01-02',
          imagesAdded: 0,
          images: 7,
          maps: 4,
          manifests: 2,
          imagesWithoutManifest: 3,
          georeferencedImages: 2,
          snapshotAt: new Date('2025-01-02T23:00:00Z')
        },
        { domain: 'one.example', day: '2025-01-03', imagesAdded: 1 }
      ])
      for (const interval of ['week', 'month', 'year'] as const) {
        const { periods } = await queryStatisticsHistory(context.db, {
          from: '2025-01-01',
          through: '2025-01-03',
          interval
        })
        expect(periods[0]).toMatchObject({
          imagesAdded: 7,
          images: 19,
          maps: 13,
          ungeoreferencedImages: 11,
          stockDay: '2025-01-02',
          availableDays: 3
        })
      }
      const partial = await queryStatisticsHistory(context.db, {
        from: '2025-01-01',
        through: '2025-01-01',
        interval: 'month'
      })
      expect(partial.periods[0]).toMatchObject({
        imagesAdded: 4,
        images: 17,
        stockDay: '2025-01-01'
      })
      // No resource or organization is needed for global, unassigned-domain totals.
      expect(await queryStatistics(context.db)).toMatchObject({
        images: 19,
        maps: 13
      })
    } finally {
      await context.close()
    }
  })
})
