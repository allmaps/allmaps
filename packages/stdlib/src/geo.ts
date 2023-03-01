// // From:
// //   https://gis.stackexchange.com/questions/156035/calculating-mercator-coordinates-from-lat-lon
// export function lonLatToWebMercator([lon, lat]: Position): Position {
//   const rMajor = 6378137.0
//   const x = rMajor * degreesToRadians(lon)
//   const scale = x / lon
//   const y =
//     (180.0 / Math.PI) *
//     Math.log(Math.tan(Math.PI / 4.0 + (lat * (Math.PI / 180.0)) / 2.0)) *
//     scale

//   return [x, y]
// }
