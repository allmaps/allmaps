import { setContext, getContext } from 'svelte'

import ReconnectingWebSocket from 'reconnecting-websocket'

import Client from 'sharedb-client-browser/dist/sharedb-client-umd.cjs'

import { throttle } from 'lodash-es'
import { type as json1Type, insertOp, replaceOp, removeOp } from 'ot-json1'

import { generateId } from '@allmaps/id'

import {
  parseOperations,
  isInsertInstruction,
  isRemoveInstruction,
  isReplaceInstruction
} from '$lib/shared/json1-operations.js'
import {
  getIncompleteGcps,
  toDbMap3s,
  isGcpComplete
} from '$lib/shared/maps.js'
import { MapsEvents } from '$lib/shared/maps-events.js'

import { MapsEventTarget } from '$lib/shared/maps-events.js'

import type { Error as ShareDBError } from 'sharedb-client-browser/dist/sharedb-client-umd.cjs'

import type { SourceState } from '$lib/state/source.svelte'
import type { ErrorState } from '$lib/state/error.svelte'

import type { Point } from '$lib/types/shared.js'
import type {
  DbMaps,
  DbGcp3,
  DbMap3,
  DbMaps3,
  DbTransformation
} from '$lib/types/maps.js'
import type {
  InsertMap,
  RemoveMap,
  InsertResourceMaskPoint,
  ReplaceResourceMaskPoint,
  RemoveResourceMaskPoint,
  InsertGcp,
  ReplaceGcp,
  RemoveGcp,
  SetTransformation
} from '$lib/types/events.js'

import { PUBLIC_ALLMAPS_API_WS_URL } from '$env/static/public'

const MAPS_KEY = Symbol('maps')

export class MapsState extends MapsEventTarget {
  #rws: ReconnectingWebSocket
  #connection: Client.Connection

  #doc: ReturnType<Client.Connection['get']> | undefined

  #maps = $state.raw<DbMaps3 | undefined>()
  #connecting = false
  #connected = $state(false)

  #connectedImageId = $state<string>()
  #imageId: string | undefined

  #sourceState: SourceState
  #errorState: ErrorState

  #activeMapId = $state<string | null>()
  #activeGcpIdPerMap = $state<Record<string, string>>({})

  #activeMap = $derived.by(() => {
    if (this.#maps && this.#activeMapId) {
      return this.#maps[this.#activeMapId]
    }
  })

  // Building Allmaps Editor on Render.com leads to this error:
  //   Cannot assign to derived state:
  //   this.activeGcpId = gcp.id;
  // Maybe this is caused by this bug:
  //   https://github.com/sveltejs/svelte/issues/15273
  // For now, rename private property.
  // TODO: When bug is fixed, update Svelte and rename property.
  #_activeGcpId = $derived.by(() => {
    if (this.#activeMapId) {
      const gcpId = this.#activeGcpIdPerMap[this.#activeMapId]
      if (gcpId && this.#isGcpIdValidForMapId(this.#activeMapId, gcpId)) {
        return gcpId
      }
    }
  })

  #activeGcp = $derived.by(() => {
    if (this.#maps && this.#activeMapId && this.#_activeGcpId) {
      return this.#maps[this.#activeMapId].gcps[this.#_activeGcpId]
    }
  })

  #incompleteGcps = $derived.by(() => {
    if (this.activeMap) {
      return getIncompleteGcps(this.activeMap)
    }

    return []
  })

  #throttledConnectToImageId = throttle(this.#connectToImageId, 1000, {
    leading: true,
    trailing: true
  })

  constructor(sourceState: SourceState, errorState: ErrorState) {
    super()

    this.#sourceState = sourceState
    this.#errorState = errorState

    this.#rws = new ReconnectingWebSocket(PUBLIC_ALLMAPS_API_WS_URL, [], {
      maxEnqueuedMessages: 0
    })

    Client.types.register(json1Type)

    // @ts-expect-error incorrect types
    this.#connection = new Client.Connection(this.#rws)

    $effect(() => {
      if (sourceState.activeImageId) {
        this.#imageId = sourceState.activeImageId

        sourceState.fetchImageInfo(this.#imageId)

        if (!this.#connecting) {
          this.#connected = false
          this.#connecting = true
          this.#throttledConnectToImageId(this.#imageId)
        }
      }
    })
  }

  #connectToImageId(imageId: string) {
    if (this.#doc) {
      this.#doc.off('op', this.#handleOperation.bind(this))

      this.#doc.destroy(() => {
        this.#setDoc(imageId)
      })
    } else {
      this.#setDoc(imageId)
    }
  }

  async #setDoc(imageId: string) {
    this.#connectedImageId = imageId
    const allmapsImageId = await generateId(imageId)

    this.#doc = this.#connection.get('images', allmapsImageId)

    this.#doc.subscribe(this.#handleSnapshot.bind(this))
    this.#doc.on('op', this.#handleOperation.bind(this))
  }

  #handleSnapshot(err: ShareDBError) {
    if (err) {
      console.error(err)
      return
    }

    if (!this.#doc) {
      return
    }

    if (
      this.#imageId &&
      this.#sourceState.activeImageId &&
      this.#imageId !== this.#connectedImageId
    ) {
      this.#throttledConnectToImageId(this.#imageId)
      return
    }

    if (!this.#doc.type) {
      this.#doc.create({}, json1Type.name)
    }

    // TODO: use Zod to validate the data
    const maps = this.#doc.data as unknown as DbMaps

    try {
      const maps3 = toDbMap3s(maps)

      const mapsNeedUpdate = Object.values(maps).some(
        (map) => map.version !== 3
      )

      if (mapsNeedUpdate) {
        for (const mapId of Object.keys(maps3)) {
          this.#doc.submitOp(removeOp([mapId]))
        }

        for (const [mapId, dbMap3] of Object.entries(maps3)) {
          this.#doc.submitOp(insertOp([mapId], dbMap3))
        }
      }

      this.#maps = maps3
      this.#activeMapId = this.#maps ? Object.keys(this.#maps)[0] : undefined
      this.#activeGcpIdPerMap = {}

      this.#connected = true
      this.#connecting = false
    } catch (err) {
      this.#errorState.error = err
    }
  }

  #handleOperation(op: unknown) {
    // Function also passes 2nd parameter localOperation: boolean
    // I think we don't need to use it.

    if (op && this.#doc) {
      this.#maps = this.#doc.data

      const operations = parseOperations(op)

      for (const { mapId, type, key, instruction } of operations) {
        if (type === 'map') {
          if (isInsertInstruction(instruction)) {
            // TODO: convert to DbMap2!
            // const map = instruction.i as DbMap
            const map = instruction.i as DbMap3

            const detail = {
              mapId,
              map
            }

            this.dispatchEvent(
              new CustomEvent<InsertMap>(MapsEvents.INSERT_MAP, { detail })
            )
          } else if (isRemoveInstruction(instruction)) {
            const detail = {
              mapId
            }

            this.dispatchEvent(
              new CustomEvent<RemoveMap>(MapsEvents.REMOVE_MAP, { detail })
            )
          }
        } else if (type === 'resourceMask') {
          const index = key

          if (typeof index !== 'number') {
            throw new Error('Resource mask point index must be a number')
          }

          if (isInsertInstruction(instruction)) {
            // TODO: use Zod to validate the data
            const point = instruction.i as Point

            const detail = {
              mapId,
              index,
              point
            }

            this.dispatchEvent(
              new CustomEvent<InsertResourceMaskPoint>(
                MapsEvents.INSERT_RESOURCE_MASK_POINT,
                { detail }
              )
            )
          } else if (isReplaceInstruction(instruction)) {
            // TODO: use Zod to validate the data
            const point = instruction.i as Point

            const detail = {
              mapId,
              index,
              point
            }

            this.dispatchEvent(
              new CustomEvent<ReplaceResourceMaskPoint>(
                MapsEvents.REPLACE_RESOURCE_MASK_POINT,
                { detail }
              )
            )
          } else if (isRemoveInstruction(instruction)) {
            const detail = {
              mapId,
              index
            }

            this.dispatchEvent(
              new CustomEvent<RemoveResourceMaskPoint>(
                MapsEvents.REMOVE_RESOURCE_MASK_POINT,
                { detail }
              )
            )
          } else {
            throw new Error('Invalid resource mask instruction')
          }
        } else if (type === 'gcps') {
          const gcpId = key

          if (typeof gcpId !== 'string') {
            throw new Error('GCP ID must be a string')
          }

          if (isInsertInstruction(instruction)) {
            // TODO: use Zod to validate the data
            const gcp = instruction.i as DbGcp3

            const detail = {
              mapId,
              gcpId,
              gcp
            }

            this.dispatchEvent(
              new CustomEvent<InsertGcp>(MapsEvents.INSERT_GCP, { detail })
            )
          } else if (isReplaceInstruction(instruction)) {
            // TODO: use Zod to validate the data
            const gcp = instruction.i as DbGcp3

            const detail = {
              mapId,
              gcpId,
              gcp
            }

            this.dispatchEvent(
              new CustomEvent<ReplaceGcp>(MapsEvents.REPLACE_GCP, { detail })
            )
          } else if (isRemoveInstruction(instruction)) {
            const detail = {
              mapId,
              gcpId
            }

            this.dispatchEvent(
              new CustomEvent<RemoveGcp>(MapsEvents.REMOVE_GCP, { detail })
            )
          }
        } else if (type === 'transformation') {
          let transformation: DbTransformation | undefined

          if ('i' in instruction) {
            // TODO: use Zod to validate the data
            transformation = instruction.i as DbTransformation
          }

          const detail = {
            mapId,
            transformation
          }

          this.dispatchEvent(
            new CustomEvent<SetTransformation>(MapsEvents.SET_TRANSFORMATION, {
              detail
            })
          )
        }
      }
    }
  }

  #isMapIdValid(mapId: string | null) {
    if (this.#maps && mapId && this.#connected) {
      return mapId in this.#maps
    }

    return false
  }

  #isGcpIdValidForMapId(mapId: string, gcpId: string) {
    if (this.#maps) {
      const map = this.#maps[mapId]

      if (map) {
        return gcpId in map.gcps
      }
    }

    return false
  }

  getMapById(mapId: string): DbMap3 | undefined {
    if (this.#maps) {
      return this.#maps[mapId]
    }
  }

  get activeMapId(): string | undefined {
    if (this.#activeMapId && this.#isMapIdValid(this.#activeMapId)) {
      return this.#activeMapId
    } else {
      const firstMapId = this.#maps ? Object.keys(this.#maps)[0] : undefined
      return firstMapId
    }
  }

  set activeMapId(mapId: string) {
    if (this.#isMapIdValid(mapId)) {
      this.#activeMapId = mapId
    }
  }

  get activeMap() {
    return this.#activeMap
  }

  get activeGcpId(): string | undefined {
    return this.#_activeGcpId
  }

  set activeGcpId(gcpId: string) {
    if (this.#activeMapId) {
      this.#activeGcpIdPerMap[this.#activeMapId] = gcpId
    }
  }

  get activeGcp() {
    return this.#activeGcp
  }

  get incompleteGcps() {
    return this.#incompleteGcps
  }

  disconnect() {
    if (this.#doc) {
      this.#doc.removeListener('op', this.#handleOperation.bind(this))
      this.#doc.destroy()
    }

    this.#rws.close()
  }

  insertMap({ mapId, map }: InsertMap) {
    if (!this.#doc) {
      return
    }

    this.#doc.submitOp(insertOp([mapId], structuredClone(map)))
    this.activeMapId = mapId
  }

  removeMap({ mapId }: RemoveMap) {
    if (!this.#doc || !this.#maps || mapId in this.#maps === false) {
      return
    }

    this.#doc.submitOp(removeOp([mapId]))
  }

  insertResourceMaskPoint({ mapId, index, point }: ReplaceResourceMaskPoint) {
    if (!this.#doc || !this.#maps || mapId in this.#maps === false) {
      return
    }

    this.#doc.submitOp(insertOp([mapId, 'resourceMask', index], point))
    this.activeMapId = mapId
  }

  replaceResourceMaskPoint({ mapId, index, point }: ReplaceResourceMaskPoint) {
    if (!this.#doc || !this.#maps || mapId in this.#maps === false) {
      return
    }

    this.#doc.submitOp(replaceOp([mapId, 'resourceMask', index], true, point))
    this.activeMapId = mapId
  }

  removeResourceMaskPoint({ mapId, index }: RemoveResourceMaskPoint) {
    if (!this.#doc || !this.#maps || mapId in this.#maps === false) {
      return
    }

    this.#doc.submitOp(removeOp([mapId, 'resourceMask', index], false))
    this.activeMapId = mapId
  }

  insertGcp({ mapId, gcp }: InsertGcp) {
    if (!this.#doc || !this.#maps || mapId in this.#maps === false) {
      return
    }

    this.#doc.submitOp(insertOp([mapId, 'gcps', gcp.id], gcp))
    this.activeMapId = mapId

    // Only set new GCP active when last GCP is complete
    if (this.activeGcp && isGcpComplete(this.activeGcp)) {
      this.activeGcpId = gcp.id
    }
  }

  replaceGcp({ mapId, gcp }: ReplaceGcp) {
    if (!this.#doc || !this.#maps || mapId in this.#maps === false) {
      return
    }

    this.#doc.submitOp(replaceOp([mapId, 'gcps', gcp.id], true, gcp))
    this.activeMapId = mapId
    this.activeGcpId = gcp.id
  }

  removeGcp({ mapId, gcpId }: RemoveGcp) {
    if (!this.#doc || !this.#maps || mapId in this.#maps === false) {
      return
    }

    this.#doc.submitOp(removeOp([mapId, 'gcps', gcpId], false))
    this.activeMapId = mapId
  }

  setTransformation({ mapId, transformation }: SetTransformation) {
    if (!this.#doc || !this.#maps || mapId in this.#maps === false) {
      return
    }

    const map = this.#maps[mapId]

    if (transformation) {
      if (map.transformation) {
        this.#doc.submitOp(
          replaceOp([mapId, 'transformation'], true, transformation)
        )
      } else {
        this.#doc.submitOp(insertOp([mapId, 'transformation'], transformation))
      }
    } else if (map.transformation) {
      this.#doc.submitOp(removeOp([mapId, 'transformation'], false))
    }
  }

  get connected() {
    return this.#connected
  }

  get maps(): DbMap3[] {
    if (this.#connected && this.#maps) {
      return Object.values(this.#maps).toSorted((a, b) => {
        if (a.index !== undefined && b.index !== undefined) {
          return a.index - b.index
        }

        return 0
      })
    }

    return []
  }

  get connectedImageId() {
    return this.#connectedImageId
  }

  get mapsCount() {
    return this.maps.length
  }
}

export function setMapsState(sourceState: SourceState, errorState: ErrorState) {
  return setContext(MAPS_KEY, new MapsState(sourceState, errorState))
}

export function getMapsState() {
  const mapsState = getContext<ReturnType<typeof setMapsState>>(MAPS_KEY)

  if (!mapsState) {
    throw new Error('MapsState is not set')
  }

  return mapsState
}
