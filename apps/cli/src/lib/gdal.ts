// export function gdalwarp (imageFilename, basename, outputDir, gcps, geoMask, tr = 0.5) {
//   return `
// #!/usr/bin/env bash

// mkdir -p ${outputDir}

// gdal_translate -of vrt \\
//   -a_srs EPSG:4326 \\
//   ${gcps.map((gcp) => `-gcp ${gcp.image.join(' ')} ${gcp.world.join(' ')}`).join(' \\\n')} \\
//   ${imageFilename} \\
//   ${outputDir}/${basename}.vrt

// echo '${JSON.stringify(geoMask)}' > ${outputDir}/${basename}.geojson

// gdalwarp -co TILED=YES \\
//   -co COMPRESS=JPEG -co JPEG_QUALITY=80 \\
//   -dstalpha -overwrite \\
//   -cutline ${outputDir}/${basename}.geojson -crop_to_cutline \\
//   -tr ${tr} ${tr} -t_srs "EPSG:3857" \\
//   ${outputDir}/${basename}.vrt \\
//   ${outputDir}/${basename}-warped.tif`.trim()
// }

// export function gdalmerge (outputDir, inputTiffs, outputTiff) {
//   // TODO: merge to VRT?!?!?!
//   return `
// gdal_merge.py -o ${outputDir}/${outputTiff} \\
//   ${inputTiffs.map((tiff) => `${outputDir}/${tiff}`).join(' ')}`.trim()
// }

// export function gdal2tiles (outputDir, outputTiff, layerId) {
//   return `
// gdal2tiles.py --xyz ${outputDir}/${outputTiff} ${outputDir}/${layerId}`.trim()
// }
