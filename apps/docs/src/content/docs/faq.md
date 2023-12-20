---
title: Frequently Asked Questions
description: ''
---

# When should I use Allmaps?

Allmaps was made for the following general use-case:

- The maps you want to work with are **images** - not vector data.
- These images are currently **hosted online on a IIIF server**, or you are able and permitted to upload them yourself to a IIIF server. (If you only have a local copy of the image on your machine, you could use a local IIIF server as a workaround). The IIIF manifest url is the starting point for making a Georeference Annotation in Allmaps Editor.
- You **know the geographic context** of your images and can identify at least a couple of points on the map. This will allow you to make a Georeference Annotation using Allmaps Editor.
- You are ok with that the georeferencing data you are creating will be **open data**.
- You want to **view** the result yourself (Allmaps Viewer), include it in an **interactive webmap** (Allmaps OpenLayers, Allmaps Leaflet or Allmaps MapLibre), or load it in a **desktop app** like QGIS or interactive online application (using XYZ tiles generated in the Allmaps Viewer by Allmaps TileServer).

Allmaps also has solutions for these adjacent use-cases:

- You want to discover maps (see Allmaps Explore, Allmaps Here, Allmaps Latest).
- You want to known if a georeference annotation exists for a certain manifest (see Allmaps Info or Allmaps Viewer).
- You want to parse and generate IIIF resources or annotations at scale (see Allmaps IIIF or Allmaps CLI)/
- You want to transform vector data like points, lines or polygons from geographic lon-lat coordinates to resource pixel coordinates or vice-versa using georeference annotations (see Allmaps CLI).

# When should I not use Allmaps?

If your use-case is one of the following, it might be better **not to use Allmaps** but look at another option:

- You only have a local copy of an image (and you are not able to set up a local IIIF server).
- You don't want your georeferencing data to be open data.
- You want to display an image on a map that does not contain a geographic context (for example a logo or icon).
- You want to display a video on a map (use something like [Leaflet Overlays](https://leafletjs.com/examples/overlays/) or [MapLibre video source](https://maplibre.org/maplibre-gl-js/docs/examples/video-on-a-map/).

# How does Allmaps compare to alternative solutions?

## Raster images in webmapping libraries

If you just want to display an image on your interactive map, most webmapping libraries contain a functionnality to get the job done. You can use e.g. something like [Leaflet Overlay](https://leafletjs.com/examples/overlays/) to display an image on a Leaflet map.

There are some disadvantages to this approach:

- Some coding is required.
- You need to have a url pointing to your image.
- This will be slow for detailed images with a large file size. You won't be able to zoom in far.
- You need to known the bounds of your (full) image.
- You can't cut out a specific mask of your image.
- You can't easily share the georeferencing information or reuse the results.

## QGIS, the georeferencer plugin and GDAL

## OldMapsOnline and Georeferencer

## ArcGIS

## MapWarper

## MapAnalyst
