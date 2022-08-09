import Event from 'ol/events/Event.js'

// Can't use normal CustomEvent, must use OpenLayers subclass
export class OLCustomEvent extends Event {
  detail: any

  constructor(type: string, options: { detail: any }) {
    super(type)

    this.detail = options.detail
  }
}
