#!/usr/bin/env bash

## Image API

### Image 1.1:

wget -O nls-7447-74478965.image.1.1.json \
  https://map-view.nls.uk/iiif/7447%2F74478965/info.json

### Image 2.0:

wget -O nls-10146-101465411.image.2.json \
  https://mapview.nls.uk/iiif/10146/101465411/info.json

wget -O uu-60-82-67-60826765847502039061478934746532282060.image.2.json \
  https://objects.library.uu.nl/fcgi-bin/iipsrv.fcgi?IIIF=/manifestation/viewer/60/82/67/60826765847502039061478934746532282060.jp2/info.json

wget -O rp-rtsa-4001-1985-1014-01.image.2.json \
  https://rotterdamspubliek.nl/iiif/NL-RtSA_4001_1985-1014-01/info.json

### Image 3.0

# This is not a map... it's just an image of lots of beetles...
wget -O nhm-vfactor-L014163620.image.3.json \
  https://data.nhm.ac.uk/iiif_images/vfactor:L014163620.jpg/info.json

## Presentation API

### Presentation 2.0

wget -O loc-87694060.presentation.2.json \
  https://www.loc.gov/item/87694060/manifest.json

wget -O ocls-cdm21033-2175.presentation.2.json \
  https://cdm21033.contentdm.oclc.org/iiif/info/krt/2175/manifest.json

wget -O bodleian-f45ff5a5-8c14-435b-82b1-f95d61f530d0.presentation.2.json \
  https://iiif.bodleian.ox.ac.uk/iiif/manifest/f45ff5a5-8c14-435b-82b1-f95d61f530d0.json

wget -O dr-collection-s-cy4drc.presentation.2.json \
  https://www.davidrumsey.com/luna/servlet/iiif/collection/s/cy4drc

wget -O zlb-34231622.presentation.2.json \
  https://digital.zlb.de/viewer/api/v1/records/34231622/manifest/

wget -O princeton-fa4fb452-5f1d-42ab-a471-53afc176c948.presentation.2.json \
  https://figgy.princeton.edu/concern/scanned_maps/fa4fb452-5f1d-42ab-a471-53afc176c948/manifest

wget -O yale-15826830.presentation.2.json \
  https://collections.library.yale.edu/manifests/15826830.json

wget -O stanford-vg994wz9415.presentation.2.json \
  https://purl.stanford.edu/vg994wz9415/iiif/manifest

### Presentation 3.0:

wget -O delft-kaartenkamer-gidskaartjes.presentation.3.json \
  https://raw.githubusercontent.com/digirati-co-uk/delft-static-site-generator/master/content/collections/library/lib-kaartenkamer/kaartenkamer-gidskaartjes.json?manifest=https://raw.githubusercontent.com/digirati-co-uk/delft-static-site-generator/master/content/collections/library/lib-kaartenkamer/kaartenkamer-gidskaartjes.json

wget -O ncsu-unccmc00094-002-ff0001_1-002-004_0001.presentation.3.json \
  "https://d.lib.ncsu.edu/collections/catalog/unccmc00094-002-ff0001_1-002-004_0001/manifest?v3=true"

wget -O polona.pl-NTU5NTE4OTg.presentation.3.json \
  https://polona.pl/iiif/item/NTU5NTE4OTg/manifest.json
