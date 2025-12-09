- [ ] Acknowledge MapLibre, Protomaps + Terra Draw
- [ ] Fix outline for all buttons
- [ ] Add option to enable/disable hillshade/terrain
- [ ] Check navPlace
- [x] Check StartGeoreferencing component
- [x] Fix aspect ratio loading example images
- [x] Check old URLs
- [ ] Support opening Georeference Annotations, show message that data is fetched from API
- [x] Show message on results page when no results
- [ ] Add compass
- [ ] Export Annotation, Manifest with embedded annotation, XYZ tile service URL, GeoTIFF, GeoJSON
- [ ] Tutorial on homepage
- [ ] Improved multiplayer mode Allow working together on georeferencing a map by sharing a URL
- [ ] Offline support
- [ ] Mention KNAW in README

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

URLs to check:

- http://localhost:5515/images?url=https%3A%2F%2Fmap-view.nls.uk%2Fiiif%2F2%2F24489%252F244892587%2Finfo.json&image=https%3A%2F%2Fmap-view.nls.uk%2Fiiif%2F2%2F24489%252F244892587&bg-preset=protomaps
- http://localhost:5515/images?url=https%3A%2F%2Fdigitalcollections.universiteitleiden.nl%2Fiiif_manifest%2Fitem%3A3282710%2Fmanifest&image=https%3A%2F%2Fiiif.universiteitleiden.nl%2Fiiif%2F2%2Fhdl%3A1887.1%25252Fitem%3A3282710
- http://localhost:5515/images?url=https%3A%2F%2Ftheseusviewer.org%2Fcollections.json&bg-preset=protomaps
- http://localhost:5515/images?url=https%3A%2F%2Fstatic.amsterdamtimemachine.nl%2Fiiif%2Fcollection.json
- http://localhost:5515/images?url=https%3A%2F%2Fiiif.ghentcdh.ugent.be%2Fiiif%2Fcollections%2Fprimitief_kadaster&page=2&path=40&manifest=https%3A%2F%2Fiiif.ghentcdh.ugent.be%2Fiiif%2Fmanifests%2Fprimitief_kadaster%3A550_0001_000_02694_000
- http://localhost:5515/images?url=https%3A%2F%2Fdlg.usg.edu%2Frecord%2Fguan_1633_014c-001%2Fpresentation%2Fmanifest.json
- http://localhost:5515/images?url=https%3A%2F%2Fsammeltassen.nl%2Fiiif-manifests%2Fstadsarchief-rotterdam%2FNL-RtSA_4201_I-118.json&image=https%3A%2F%2Fsammeltassen.nl%2Fiiif-images%2Fstadsarchief-rotterdam%2FNL-RtSA_4201_I-118-9&basemap-preset=protomaps&bg-preset=protomaps
- http://localhost:5515/results?url=https%3A%2F%2Fcollections.lib.uwm.edu%2Fiiif%2Finfo%2Fagdm%2F2697%2Fmanifest.json&image=https%3A%2F%2Fcdm17272.contentdm.oclc.org%2Fiiif%2F2%2Fagdm%3A2697
- http://localhost:5515/georeference?url=https%3A%2F%2Fwww.loc.gov%2Fitem%2F88695674%2Fmanifest.json&basemap-preset=&bg-preset=protomaps&image=https%3A%2F%2Ftile.loc.gov%2Fimage-services%2Fiiif%2Fservice%3Agmd%3Agmd384%3Ag3842%3Ag3842c%3Act008615
