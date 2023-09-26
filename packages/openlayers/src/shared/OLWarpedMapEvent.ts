import type { Class } from './types.js'

export default function createOLWarpedMapEventClass(BaseEvent: Class) {
  const OLWarpedMapEvent: typeof BaseEvent = class extends BaseEvent {
    data: unknown

    constructor(type: string, data: unknown) {
      super(type)

      this.data = data
    }
  }

  return OLWarpedMapEvent
}
