- [ ] Add URL params
  - `userBaseMapUrl`
  - `callback`
  - `bbox`
    ```js
    bbox = bboxStringParts.map((str) => parseFloat(str))
    const extent = [
      ...fromLonLat([bbox[0], bbox[1]]),
      ...fromLonLat([bbox[2], bbox[3]])
    ]
    ```
- [ ] Add IIIF Collection support
- [ ] Copy button in Annotation
- [x] Fix `masks.svg`
- [ ] Remember map positions (in local storage?)
- [ ] Improve intro screen (smaller!) Use Toast?
- [ ] Improve settings drawer
- [ ] Move export to Results View
- [ ] Geocoder
- [x] Select transformation
- [ ] `navPlace`
