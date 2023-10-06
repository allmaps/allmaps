import Event from 'ol/events/Event.js'

export class OLWarpedMapEvent extends Event {
  data: unknown

  constructor(type: string, data: unknown) {
    super(type)

    this.data = data
  }
}
