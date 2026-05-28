#!/usr/bin/env bash

mkdir -p .

if ! command -v gdalinfo &> /dev/null
then
  echo "Error: gdalinfo could not be found. Please install GDAL."
  exit 1
fi
if ! command -v gdalbuildvrt &> /dev/null
then
  echo "Error: gdalbuildvrt could not be found. Please install GDAL."
  exit 1
fi
if ! command -v gdal_translate &> /dev/null
then
  echo "Error: gdal_translate could not be found. Please install GDAL."
  exit 1
fi
if ! command -v gdalwarp &> /dev/null
then
  echo "Error: gdalwarp could not be found. Please install GDAL."
  exit 1
fi
if ! command -v jq &> /dev/null
then
  echo "Error: jq could not be found. Please install jq: https://jqlang.github.io/jq/."
  exit 1
fi

if ! [ -f ./bc5d7040bad8e28b.jpg ]; then
  echo "Image file does not exist: ./bc5d7040bad8e28b.jpg"
  echo "This script expects a full-size source images for each georeferenced map it processes. See the README for more information."
  exit 1
fi

required_width_bc5d7040bad8e28b_5cf13f6681d355e3=5240
required_height_bc5d7040bad8e28b_5cf13f6681d355e3=3994

width_bc5d7040bad8e28b_5cf13f6681d355e3=( $(gdalinfo -json ./bc5d7040bad8e28b.jpg | jq '.size[0]') )
height_bc5d7040bad8e28b_5cf13f6681d355e3=( $(gdalinfo -json ./bc5d7040bad8e28b.jpg | jq '.size[1]') )

if [ "$width_bc5d7040bad8e28b_5cf13f6681d355e3" -eq "$required_width_bc5d7040bad8e28b_5cf13f6681d355e3" ] &&
   [ "$height_bc5d7040bad8e28b_5cf13f6681d355e3" -eq "$required_height_bc5d7040bad8e28b_5cf13f6681d355e3" ]; then
    echo "Found image with correct size: ./bc5d7040bad8e28b.jpg"
else
    echo "Error: found image with incorrect size"
    echo "  Image: ./bc5d7040bad8e28b.jpg"
    echo "  Expected: $required_width_bc5d7040bad8e28b_5cf13f6681d355e3 x $required_height_bc5d7040bad8e28b_5cf13f6681d355e3"
    echo "  Found: $width_bc5d7040bad8e28b_5cf13f6681d355e3 x $height_bc5d7040bad8e28b_5cf13f6681d355e3"
    exit 1
fi
gdal_translate -of vrt \
  -a_srs 'EPSG:3857' \
  -gcp 1801 2421 548613.3751837945 6864617.739664596 \
-gcp 4222 1445 546926.5398078549 6863398.238686091 \
-gcp 1146 1267 549383.7060600839 6863825.8467286 \
  ./bc5d7040bad8e28b.jpg \
  ./bc5d7040bad8e28b_5cf13f6681d355e3.vrt

echo '{"type":"Polygon","coordinates":[[[4.94201498,52.34722138],[4.93550321,52.36205672],[4.90438837,52.35761706],[4.91116646,52.34282311],[4.94201498,52.34722138]]]}' > ./bc5d7040bad8e28b_5cf13f6681d355e3.geojson

gdalwarp \
  -of COG -co COMPRESS=JPEG -co QUALITY=75 \
  -dstalpha -overwrite \
  -r cubic \
  -cutline ./bc5d7040bad8e28b_5cf13f6681d355e3.geojson -crop_to_cutline -cutline_srs "EPSG:4326" \
  -s_srs 'EPSG:3857' \
  -t_srs 'EPSG:3857' \
  -ts 5143 4304 \
  -order 1 \
  ./bc5d7040bad8e28b_5cf13f6681d355e3.vrt \
  ./bc5d7040bad8e28b_5cf13f6681d355e3-warped.tif
if ! [ -f ./b001de2950590a8d.jpg ]; then
  echo "Image file does not exist: ./b001de2950590a8d.jpg"
  echo "This script expects a full-size source images for each georeferenced map it processes. See the README for more information."
  exit 1
fi

required_width_b001de2950590a8d_83d44a0b956681b0=5208
required_height_b001de2950590a8d_83d44a0b956681b0=3949

width_b001de2950590a8d_83d44a0b956681b0=( $(gdalinfo -json ./b001de2950590a8d.jpg | jq '.size[0]') )
height_b001de2950590a8d_83d44a0b956681b0=( $(gdalinfo -json ./b001de2950590a8d.jpg | jq '.size[1]') )

if [ "$width_b001de2950590a8d_83d44a0b956681b0" -eq "$required_width_b001de2950590a8d_83d44a0b956681b0" ] &&
   [ "$height_b001de2950590a8d_83d44a0b956681b0" -eq "$required_height_b001de2950590a8d_83d44a0b956681b0" ]; then
    echo "Found image with correct size: ./b001de2950590a8d.jpg"
else
    echo "Error: found image with incorrect size"
    echo "  Image: ./b001de2950590a8d.jpg"
    echo "  Expected: $required_width_b001de2950590a8d_83d44a0b956681b0 x $required_height_b001de2950590a8d_83d44a0b956681b0"
    echo "  Found: $width_b001de2950590a8d_83d44a0b956681b0 x $height_b001de2950590a8d_83d44a0b956681b0"
    exit 1
fi
gdal_translate -of vrt \
  -a_srs 'EPSG:3857' \
  -gcp 4346 2550 549983.8183030015 6865114.585151263 \
-gcp 2243 1837 551701.3778583999 6864958.450720401 \
-gcp 3823 1010 550703.9552208921 6864005.396387596 \
  ./b001de2950590a8d.jpg \
  ./b001de2950590a8d_83d44a0b956681b0.vrt

echo '{"type":"Polygon","coordinates":[[[4.97055472,52.35232547],[4.96426763,52.36676708],[4.93534541,52.36226214],[4.94211662,52.34766467],[4.97055472,52.35232547]]]}' > ./b001de2950590a8d_83d44a0b956681b0.geojson

gdalwarp \
  -of COG -co COMPRESS=JPEG -co QUALITY=75 \
  -dstalpha -overwrite \
  -r cubic \
  -cutline ./b001de2950590a8d_83d44a0b956681b0.geojson -crop_to_cutline -cutline_srs "EPSG:4326" \
  -s_srs 'EPSG:3857' \
  -t_srs 'EPSG:3857' \
  -ts 4955 4402 \
  -order 1 \
  ./b001de2950590a8d_83d44a0b956681b0.vrt \
  ./b001de2950590a8d_83d44a0b956681b0-warped.tif
if ! [ -f ./44a2797e3fc5e3cf.jpg ]; then
  echo "Image file does not exist: ./44a2797e3fc5e3cf.jpg"
  echo "This script expects a full-size source images for each georeferenced map it processes. See the README for more information."
  exit 1
fi

required_width_44a2797e3fc5e3cf_3b72f58c723da9c4=5328
required_height_44a2797e3fc5e3cf_3b72f58c723da9c4=4003

width_44a2797e3fc5e3cf_3b72f58c723da9c4=( $(gdalinfo -json ./44a2797e3fc5e3cf.jpg | jq '.size[0]') )
height_44a2797e3fc5e3cf_3b72f58c723da9c4=( $(gdalinfo -json ./44a2797e3fc5e3cf.jpg | jq '.size[1]') )

if [ "$width_44a2797e3fc5e3cf_3b72f58c723da9c4" -eq "$required_width_44a2797e3fc5e3cf_3b72f58c723da9c4" ] &&
   [ "$height_44a2797e3fc5e3cf_3b72f58c723da9c4" -eq "$required_height_44a2797e3fc5e3cf_3b72f58c723da9c4" ]; then
    echo "Found image with correct size: ./44a2797e3fc5e3cf.jpg"
else
    echo "Error: found image with incorrect size"
    echo "  Image: ./44a2797e3fc5e3cf.jpg"
    echo "  Expected: $required_width_44a2797e3fc5e3cf_3b72f58c723da9c4 x $required_height_44a2797e3fc5e3cf_3b72f58c723da9c4"
    echo "  Found: $width_44a2797e3fc5e3cf_3b72f58c723da9c4 x $height_44a2797e3fc5e3cf_3b72f58c723da9c4"
    exit 1
fi
gdal_translate -of vrt \
  -a_srs 'EPSG:3857' \
  -gcp 560 3581 549978.1298770219 6863216.971363358 \
-gcp 2803 2460 548498.1706427726 6861901.91679246 \
-gcp 1009 1245 550155.4284300082 6861373.64125519 \
  ./44a2797e3fc5e3cf.jpg \
  ./44a2797e3fc5e3cf_3b72f58c723da9c4.vrt

echo '{"type":"Polygon","coordinates":[[[4.94796274,52.33436548],[4.94151774,52.34781000],[4.91119362,52.34265675],[4.91787078,52.32933417],[4.94796274,52.33436548]]]}' > ./44a2797e3fc5e3cf_3b72f58c723da9c4.geojson

gdalwarp \
  -of COG -co COMPRESS=JPEG -co QUALITY=75 \
  -dstalpha -overwrite \
  -r cubic \
  -cutline ./44a2797e3fc5e3cf_3b72f58c723da9c4.geojson -crop_to_cutline -cutline_srs "EPSG:4326" \
  -s_srs 'EPSG:3857' \
  -t_srs 'EPSG:3857' \
  -ts 5176 4257 \
  -order 1 \
  ./44a2797e3fc5e3cf_3b72f58c723da9c4.vrt \
  ./44a2797e3fc5e3cf_3b72f58c723da9c4-warped.tif
if ! [ -f ./0618d3727f002bcf.jpg ]; then
  echo "Image file does not exist: ./0618d3727f002bcf.jpg"
  echo "This script expects a full-size source images for each georeferenced map it processes. See the README for more information."
  exit 1
fi

required_width_0618d3727f002bcf_bb4029969eeff948=5288
required_height_0618d3727f002bcf_bb4029969eeff948=3959

width_0618d3727f002bcf_bb4029969eeff948=( $(gdalinfo -json ./0618d3727f002bcf.jpg | jq '.size[0]') )
height_0618d3727f002bcf_bb4029969eeff948=( $(gdalinfo -json ./0618d3727f002bcf.jpg | jq '.size[1]') )

if [ "$width_0618d3727f002bcf_bb4029969eeff948" -eq "$required_width_0618d3727f002bcf_bb4029969eeff948" ] &&
   [ "$height_0618d3727f002bcf_bb4029969eeff948" -eq "$required_height_0618d3727f002bcf_bb4029969eeff948" ]; then
    echo "Found image with correct size: ./0618d3727f002bcf.jpg"
else
    echo "Error: found image with incorrect size"
    echo "  Image: ./0618d3727f002bcf.jpg"
    echo "  Expected: $required_width_0618d3727f002bcf_bb4029969eeff948 x $required_height_0618d3727f002bcf_bb4029969eeff948"
    echo "  Found: $width_0618d3727f002bcf_bb4029969eeff948 x $height_0618d3727f002bcf_bb4029969eeff948"
    exit 1
fi
gdal_translate -of vrt \
  -a_srs 'EPSG:3857' \
  -gcp 3324 3373 551263.6807525499 6863348.324617058 \
-gcp 3794 1538 551271.7514156324 6861899.42063415 \
-gcp 4463 2750 550532.990746932 6862641.834070058 \
  ./0618d3727f002bcf.jpg \
  ./0618d3727f002bcf_bb4029969eeff948.vrt

echo '{"type":"Polygon","coordinates":[[[4.97598531,52.33961501],[4.97014515,52.35273740],[4.94187738,52.34749046],[4.94741239,52.33453337],[4.97598531,52.33961501]]]}' > ./0618d3727f002bcf_bb4029969eeff948.geojson

gdalwarp \
  -of COG -co COMPRESS=JPEG -co QUALITY=75 \
  -dstalpha -overwrite \
  -r cubic \
  -cutline ./0618d3727f002bcf_bb4029969eeff948.geojson -crop_to_cutline -cutline_srs "EPSG:4326" \
  -s_srs 'EPSG:3857' \
  -t_srs 'EPSG:3857' \
  -ts 4933 4310 \
  -order 1 \
  ./0618d3727f002bcf_bb4029969eeff948.vrt \
  ./0618d3727f002bcf_bb4029969eeff948-warped.tif

gdalbuildvrt ./merged.vrt \
  ./bc5d7040bad8e28b_5cf13f6681d355e3-warped.tif ./b001de2950590a8d_83d44a0b956681b0-warped.tif ./44a2797e3fc5e3cf_3b72f58c723da9c4-warped.tif ./0618d3727f002bcf_bb4029969eeff948-warped.tif
