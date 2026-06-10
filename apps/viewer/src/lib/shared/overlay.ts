// // Control overlay layers visibility
// $effect(() => {
//   if (!map) {
//     return
//   }

//   if (mapLoaded) {
//     if (map.getLayer('overlay-streets')) {
//       map.setLayoutProperty(
//         'overlay-streets',
//         'visibility',
//         overlay.streets ? 'visible' : 'none'
//       )
//     }

//     if (map.getLayer('overlay-buildings')) {
//       map.setLayoutProperty(
//         'overlay-buildings',
//         'visibility',
//         overlay.buildings ? 'visible' : 'none'
//       )
//     }
//   }
// })

// // Add overlay layers on top of warped maps
// map.addLayer({
//   id: 'overlay-streets',
//   type: 'line',
//   source: 'protomaps',
//   'source-layer': 'roads',
//   paint: {
//     'line-color': '#ffffff',
//     'line-width': 2,
//     'line-opacity': 0.8
//   },
//   layout: {
//     visibility: overlay.streets ? 'visible' : 'none'
//   }
// })

// map.addLayer({
//   id: 'overlay-buildings',
//   type: 'fill',
//   source: 'protomaps',
//   'source-layer': 'buildings',
//   paint: {
//     'fill-color': pink,
//     'fill-opacity': 0.3,
//     'fill-outline-color': 'rgba(0, 0, 0, 1)'
//     // 'fill-outline-opacity': 0.8
//   },
//   layout: {
//     visibility: overlay.buildings ? 'visible' : 'none'
//   }
// })

// map.addLayer({
//   id: 'overlay-buildings-line',
//   type: 'line',
//   source: 'protomaps',
//   'source-layer': 'buildings',
//   paint: {
//     'line-color': pink,
//     'line-opacity': 1,
//     'line-width': 2

//     // 'line-outline-opacity': 0.8
//   },
//   layout: {
//     visibility: overlay.buildings ? 'visible' : 'none'
//   }
// })
