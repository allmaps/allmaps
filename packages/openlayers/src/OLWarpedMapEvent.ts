import Event from 'ol/events/Event.js'

export class OLWarpedMapEvent extends Event {
  data: any

  constructor(type: string, data: any) {
    super(type)

    this.data = data
  }
}
