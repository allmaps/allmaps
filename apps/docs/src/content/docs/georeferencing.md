---
title: What is georeferencing?
description: ''
---

Georeferencing an image means relating specific pixels of the image [x, y] to corresponding points on the world map [longitude, latitude]. A pair of corresponding points is called a Ground Control Point or GCP. When such correspondences are established for at least 2 or 3 points, we can use algorithms to compute for any other point on the image the corresponding point on the world map. If we do this for every pixel, we can display the original image on a world map. Results depend on the algorithm used: each warps the image in a different way to suite the given GCPs as well as possible.

In Allmaps, Georeferencing a IIIF image or manifest means creating a Georeference Annotation about that IIIF resource which will contain all the relevant georeferencing information: a link to the resource we are annotating, a selector to specify which part of the resource we are annotation and a set of GCPs. If can also contain extra information like a georeferencing algorithm if we have a particular one we’d suggest to use.

And note: it’s important to get the difference between a Resource (manifest or image), and a Georeference Annotation. Both are small JSON files (which can be hosted online and thus be referenced using a URI: https://… ), the first describes a IIIF resource, the second an annotation about that resource (and it contains a link to it).

### The Allmaps approach to georeferencing

Georeferencing is not a new thing. Classical GIS tools like QGIS and ArcGIS have allowed this for a long time. The classical process was to create a warped copy of the original image, saved either as a geotiff or a classical image file with accompanying ‘world’ file. In both cases, the original image and its copied needed to be stored on the user’s device. Also, making copies creates a lot of extra data and is not flexible when we e.g. add extra GCPs to perfect create a better fit: this would require us to create the warped image copy again.

The Allmaps approach is different: we work with IIIF resources which are hosted on the server of an institution and museum \- not on our own device. We only story the resulting Georeference Annotation \- a very small file \- and the Allmaps database keeps a copy of it so other people can use it and improve it too. And best of all: no copies are created, we warp original the image live in the browser. This is very fast and flexible when adding new GCPs, changing color etc.

Allmaps is a toolkit of Open Source apps for creating and using Georeference Annotations, i.e. for georeferencing and viewing IIIF maps. It is also an Open Data database of georeferenced maps. Georeferencing is done in Allmaps Editor, a tool to go from a IIIF resource to a Georeference Annotation\!

### Georeference Annotation

For more information about the format of the Georeference Annotation, please consult the [documentation](https://iiif.io/api/extension/georef/) on the IIIF website.
