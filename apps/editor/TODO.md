First:

- [x] Add URL params

  - `userBaseMapUrl`
  - `userAnnotationUrl`
  - `callback`
  - `bbox`
    ```js
    bbox = bboxStringParts.map((str) => parseFloat(str))
    const extent = [
      ...fromLonLat([bbox[0], bbox[1]]),
      ...fromLonLat([bbox[2], bbox[3]])
    ]
    ```

- [x] Index voor DbMap, net zoals DbGcp
- [x] Als je een masker selecteert moet ie best centreren op dat masker is resource en geo (en dat gebeurt nu niet!). Idem voor het selecteren van een punt.
- [ ] En de Results moet de Scope volgen
- [ ] Get correct geo viewport on Results page
- [ ] navPlace
- [ ] Callback/projects
- [ ] Fix loading screen when started with ?url= parameter
- [x] Een bevestigend scherm voor je een masker of GCP effectief wist zou veel leed kunnen voorkomen.
- [x] Why multple https://dev.api.allmaps.org/manifests/862e3f4c5dc3bc08/maps fetches in the beginning?
- [x] Clear viewports state when loading new URL
- [x] Clear map-history when loading new URL
- [x] Check StartGeoreferencing component
- [x] Correct order when first adding GCPs in resource, then in geo
- [x] Better selection rectangles around images
- [x] Error page
- [x] Fix aspect ratio loading example images
- [x] Check old URLs
- [x] Copy button in Annotation
- [x] Remember map positions (in local storage?)
- [x] Select transformation
- [x] Results disabled when no maps
- [ ] Support opening Georeference Annotations, show message that data is fetched from API

Then:

- [ ] Show message on results page when no results
- [x] Fix `masks.svg`
- [ ] Add IIIF Collection support
- [ ] Improve error messages (including CORS). Add links to docs, other IIIF viewers, IIIF validators, etc.
- [x] Improve intro screen (smaller!) Use Toast?
- [ ] Improve settings drawer
- [ ] Warped map preview in Georeference view. Add opacity slider
- [ ] Buttons in geo views
  - [ ] Geocoder
  - [ ] Compass!
  - [ ] Button to zoom to map's extent, phosphor icon corners-out
- [ ] `navPlace`
- [ ] Add more export options
- [ ] Make sure links to docs work
- [ ] Add image sneak peek
- [ ] Export Annotation, Manifest with embedded annotation, XYZ tile service URL, GeoTIFF, GeoJSON
- [ ] QGIS import & export
- [ ] Import GCPs from file
- [ ] Editable GCP coordinates
- [ ] Projections
- [ ] Tutorial on homepage
- [ ] Improved multiplayer mode Allow working together on georeferencing a map by sharing a URL
- [ ] Offline support
- [ ] Mention KNAW in README
- [x] Smaller cloud icon
- [x] Use next.bits-ui.com

James:

1. Why is the `td-point` source not available after adding and starting Terra Draw?. I've implemented a workaround using `setTimeout`, this works, but is of course very hacky.
2. How to remove points or polygon vertices using the mouse and on a smartphone? Implement custom event listeners and extend the API to remove points and verctices myself?
3. Can I select features by clicking on them in TerraDrawPolygonMode. Now, clicking on the map always starts drawing a new polygon.
4. Create a function to close a newly drawn polygon. And is it possible to detect whether this new polygon _can_ be closed (has more than 3 points, no self-interection, is valid according to other specific rules?)
5. I'm styling polygon's `coordinatePoint`s according to the ID of their parent polygon. I'm now using the `coordinatePointIds` properties to check whether the point ID belongs to the parent polygon, this works fine! But a direct property on the points would make it even easier.

1,2,3,4 images:

- http://localhost:5515/images?url=https%3A%2F%2Fdigitalcollections.universiteitleiden.nl%2Fiiif_manifest%2Fitem%3A3639252%2Fmanifest&image=https%3A%2F%2Fiiif.universiteitleiden.nl%2Fiiif%2F2%2Fhdl%3A1887.1%252Fitem%3A3639252&basemap-preset=esri-world-topo
- http://localhost:5515/images?url=https%3A%2F%2Fwww.loc.gov%2Fitem%2Fsanborn08257_004%2Fmanifest.json&image=https%3A%2F%2Ftile.loc.gov%2Fimage-services%2Fiiif%2Fservice%3Agmd%3Agmd418m%3Ag4184m%3Ag4184pm%3Ag082571904%3A08257_1904-0001
- http://localhost:5515/images?url=https%3A%2F%2Fwww.loc.gov%2Fitem%2Fsanborn01352_002%2Fmanifest.json&image=https%3A%2F%2Ftile.loc.gov%2Fimage-services%2Fiiif%2Fservice%3Agmd%3Agmd393m%3Ag3934m%3Ag3934tm%3Ag3934tm_g013521887%3A01352_1887-0003
- http://localhost:5515/images?url=https%3A%2F%2Fwww.loc.gov%2Fitem%2Fsanborn06922_003%2Fmanifest.json&image=https%3A%2F%2Ftile.loc.gov%2Fimage-services%2Fiiif%2Fservice%3Agmd%3Agmd408m%3Ag4084m%3Ag4084vm%3Ag4084vm_g069221904%3A06922_1904-0001
