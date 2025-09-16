import Geocoder from '$lib/components/Geocoder.svelte'
import ProjectionPicker from '$lib/components/ProjectionPicker.svelte'
import TransformationTypePicker from '$lib/components/TransformationTypePicker.svelte'
import DistortionMeasurePicker from '$lib/components/DistortionMeasurePicker.svelte'

import { GeocodeEarthGeocoderProvider } from '$lib/shared/geocoder/providers/geocode-earth.js'
import { WorldHistoricalGazetteerGeocoderProvider } from '$lib/shared/geocoder/providers/world-historical-gazetteer.js'

import { getUrlState, setUrlState } from '$lib/state/url.svelte.js'

import type { GeocoderGeoJsonFeature } from '$lib/shared/geocoder/types.js'

export {
  Geocoder,
  ProjectionPicker,
  TransformationTypePicker,
  DistortionMeasurePicker
}
export {
  GeocodeEarthGeocoderProvider,
  WorldHistoricalGazetteerGeocoderProvider
}

export { getUrlState, setUrlState }

export type { GeocoderGeoJsonFeature }
