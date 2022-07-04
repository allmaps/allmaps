# Allmaps Tile Server

Turns maps georeferenced with Allmaps into XYZ map tiles.

See https://observablehq.com/@bertspaan/allmaps-tile-server.

![](screenshot.jpg)

Example URLs:

- http://localhost:8787/maps/CFqQGwiHhs5Bf4Bu/16/33572/21677.png
- http://localhost:8787/16/33572/21677.png?annotation=%7B%22type%22%3A%22Annotation%22%2C%22id%22%3A%22https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2FCFqQGwiHhs5Bf4Bu%22%2C%22%40context%22%3A%5B%22http%3A%2F%2Fwww.w3.org%2Fns%2Fanno.jsonld%22%2C%22http%3A%2F%2Fgeojson.org%2Fgeojson-ld%2Fgeojson-context.jsonld%22%2C%22http%3A%2F%2Fiiif.io%2Fapi%2Fpresentation%2F3%2Fcontext.json%22%5D%2C%22motivation%22%3A%22georeferencing%22%2C%22target%22%3A%7B%22type%22%3A%22Image%22%2C%22source%22%3A%22https%3A%2F%2Fcdm21033.contentdm.oclc.org%2Fiiif%2F2%2Fkrt%3A2891%2Ffull%2Ffull%2F0%2Fdefault.jpg%22%2C%22service%22%3A%5B%7B%22%40id%22%3A%22https%3A%2F%2Fcdm21033.contentdm.oclc.org%2Fiiif%2F2%2Fkrt%3A2891%22%2C%22type%22%3A%22ImageService2%22%7D%5D%2C%22selector%22%3A%7B%22type%22%3A%22SvgSelector%22%2C%22value%22%3A%22%3Csvg+width%3D%5C%225965%5C%22+height%3D%5C%222514%5C%22%3E%3Cpolygon+points%3D%5C%225917%2C2354+5908%2C79+71%2C81+62%2C2316+5917%2C2354%5C%22+%2F%3E%3C%2Fsvg%3E%22%7D%7D%2C%22body%22%3A%7B%22type%22%3A%22FeatureCollection%22%2C%22purpose%22%3A%22gcp-georeferencing%22%2C%22transformation%22%3A%7B%22type%22%3A%22polynomial%22%2C%22order%22%3A0%7D%2C%22features%22%3A%5B%7B%22type%22%3A%22Feature%22%2C%22id%22%3A%223gaP7eqrmBQsDVZB%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B5589%2C449%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B4.5004097%2C51.9163697%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22id%22%3A%2291Wc5Hkru2CApuqT%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B2027%2C402%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B4.4066919%2C51.9088182%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22id%22%3A%22GymShheYQL6bpit9%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B4089%2C1688%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B4.4660261%2C51.8927421%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22id%22%3A%22gCvdaSWgKgx3Ht6Y%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B4323%2C1333%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B4.4705962%2C51.8992239%5D%7D%7D%5D%7D%7D
