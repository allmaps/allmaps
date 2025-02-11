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
- [ ] Get correct geo viewport
- [ ] Callback/projects
- [ ] Check StartGeoreferencing component
- [ ] Correct order when first adding GCPs in resource, then in geo
- [x] Better selection rectangles around images
- [x] Error page
- [x] Fix aspect ratio loading example images
- [x] Check old URLs
- [x] Copy button in Annotation
- [x] Remember map positions (in local storage?)
- [x] Select transformation
- [x] Results disabled when no maps

Then:

- [ ] Show message on results page when no results
- [x] Fix `masks.svg`
- [x] Smaller cloud icon
- [ ] Add IIIF Collection support
- [ ] Error messages
- [ ] Improve intro screen (smaller!) Use Toast?
- [ ] Improve settings drawer
- [ ] Geocoder
- [ ] `navPlace`
- [ ] Add more export options
- [ ] Button to zoom to map's extent
- [ ] Add retina tiles with switch button
- [ ] Use next.bits-ui.com
- [ ] Make sure links to docs work
- [ ] Add image sneak peek
