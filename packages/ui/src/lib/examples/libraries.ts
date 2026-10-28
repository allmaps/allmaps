import type { ExampleLibrary, MapExampleImplementationProps } from './types.js'

// Keep the registry safe to import during SSR and before the map is visible.
// Each runtime loads its mapping library, Allmaps plugin and CSS on demand.
export const exampleLibraries: Record<
  ExampleLibrary,
  Pick<MapExampleImplementationProps, 'packages' | 'createExample'>
> = {
  MapLibre: {
    packages: 'maplibre-gl @allmaps/maplibre',
    createExample: async (container, signal, view) =>
      (await import('./maplibre-runtime.js')).createExample(
        container,
        signal,
        view
      )
  },
  Leaflet: {
    packages: 'leaflet @allmaps/leaflet',
    createExample: async (container, signal, view) =>
      (await import('./leaflet-runtime.js')).createExample(
        container,
        signal,
        view
      )
  },
  OpenLayers: {
    packages: 'ol @allmaps/openlayers',
    createExample: async (container, signal, view) =>
      (await import('./openlayers-runtime.js')).createExample(
        container,
        signal,
        view
      )
  }
}
