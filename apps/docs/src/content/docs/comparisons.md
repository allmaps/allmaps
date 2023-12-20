# Know when to use Allmaps

Allmaps was made for the following general use-case:

- The maps you want to work with are **images** - not vector data.
- These images are currently **hosted online on a IIIF server**, or you are able and permitted to upload them yourself to a IIIF server. (If you only have a local copy of the image on your machine, you could use a local IIIF server as a workaround). The IIIF manifest url is the starting point for making a Georeference Annotation in Allmaps Editor.
- You **know the geographic context** of your images and can identify at least a couple of points on the map. This will allow you to make a Georeference Annotation using Allmaps Editor.
- You are ok with that the georeferencing data you are creating will be **open data**.
- You want to **view** the result yourself (Allmaps Viewer), include it in an **interactive webmap** (Allmaps OpenLayers, Allmaps Leaflet or Allmaps MapLibre) or load it in a **desktop app** like QGIS (using XYZ tiles generated in the Allmaps Viewer by Allmaps TileServer)

Allmaps also has solutions for these adjacent use-cases:

- You want to discover maps (see Allmaps Explore, Allmaps Here, Allmaps Latest)
- You want to known if a georeference annotation exists for a certain manifest (see Allmaps Info or Allmaps Viewer)
- You want to parse and generate IIIF resources or annotations at scale (see Allmaps IIIF or Allmaps CLI)
- You want to transform vector data like points, lines or polygons from geographic lon-lat coordinates to resource pixel coordinates or vice-versa using georeference annotations (see Allmaps CLI)

If your use-case is one of the following, it might be better **not to use Allmaps** but look at another option:

- You only have a local copy of an image (and you are not able to set up a local IIIF server).
- You don't want your georeferencing data to be open data.

# Alternatives and comparisons

## Raster images in webmapping libraries

If you have the URL of an image, you can display it on

## QGIS, the georeferencer plugin and GDAL

## OldMapsOnline and Georeferencer

## ArcGIS

## MapWarper

## MapAnalyst
