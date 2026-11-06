import { toolIdentities } from './tool-identities.js'
import { defineScreenshot } from '@allmaps/ui/screenshots'

import type { ScreenshotOptions } from '@allmaps/ui/screenshots'

type ShowcaseProject = {
  id: string
  title: string
  url: string
  description: string
  links?: { title: string; url: string }[]
  screenshotSource?: { title: string; url: string }
  screenshot?: Partial<Omit<ScreenshotOptions, 'slug'>>
}

export const showcaseProjects: ShowcaseProject[] = [
  {
    id: 'nypl-digital-collections',
    title: 'NYPL Digital Collections',
    url: 'https://digitalcollections.nypl.org/',
    description:
      'The New York Public Library brings georeferenced maps into its digital collections. Readers can overlay historical maps on a modern map directly from an item’s record.',
    screenshot: {
      url: 'https://digitalcollections.nypl.org/items/f3b990f0-c5aa-012f-b01d-58d385a7bc34',
      version: 4,
      viewport: { width: 1500, height: 1000, deviceScaleFactor: 1 },
      steps: [
        { action: 'click', selector: 'button[aria-label="Zoom In"]' },
        { action: 'click', selector: 'button[aria-label="Zoom In"]' }
      ],
      delay: 10000
    }
  },
  {
    id: 'reuzenarbeid',
    title: 'Reuzenarbeid',
    url: 'https://tu-delft-heritage.github.io/reuzenarbeid/',
    description:
      'Historical photographs and maps tell the story of the canals, railways, bridges and other engineering works that shaped the modern Netherlands. An interactive companion to Willem van der Ham’s book, developed with TU Delft Library.',
    screenshot: {
      url: 'https://tu-delft-heritage.github.io/reuzenarbeid/#noordzeekanaal',
      version: 4,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
      steps: [{ action: 'click', selector: 'button[aria-label="Inzoomen"]' }],
      waitForRender: true,
      delay: 10000
    }
  },
  {
    id: 'watertijdreis',
    title: 'Watertijdreis',
    url: 'https://watertijdreis.nl/',
    description:
      'Explore more than a century of Dutch water management through successive editions of the Waterstaatskaart. Historical map sheets reveal changing waterways, polders, pumping stations and coastlines.',
    screenshot: {
      url: 'https://watertijdreis.nl/?c=52.164_5.378&zoom=8.50',
      version: 2,
      delay: 10000
    }
  },
  {
    id: 'vietnam-map-archive',
    title: 'Vietnam Map Archive',
    url: 'https://maparchive.vn/',
    description:
      'An archive of historical maps of Vietnam, brought together in an interactive map viewer. Allmaps places digitized map sheets over present-day geography so visitors can explore and compare them.',
    screenshot: {
      steps: [{ action: 'click', selector: 'button:text-is("Decline")' }]
    }
  },
  {
    id: 'tabula-peutingeriana',
    title: 'Tabula Peutingeriana',
    url: 'https://pages.allmaps.org/tabula-peutingeriana/',
    description:
      'Compare the Tabula Peutingeriana, a medieval copy of a Roman road map, with OpenStreetMap. The side-by-side experiment connects the map’s distinctive, stretched geography to familiar places.',
    // The demo opens at a random location. Version 2 was framed around Rome
    // manually; refreshing this capture requires navigating there again.
    screenshot: {
      version: 2
    }
  },
  {
    id: 'allmaps-cursors',
    title: 'Allmaps Cursors',
    url: 'https://cursors.allmaps.org/',
    description:
      'Move between an original map image and its geographic location with linked cursors. This experiment makes the relationship between image coordinates and real-world coordinates visible.',
    screenshot: {
      url: 'https://cursors.allmaps.org/?url=https://annotations.allmaps.org/maps/8568d3e122117c6f'
    }
  },
  {
    id: 'mapsnap',
    title: 'mapsnap',
    url: 'https://mapsnap.org/',
    description:
      'Dan Vanderkam’s project automatically georeferences Sanborn fire insurance maps by matching their printed street names to OpenStreetMap. Explore historical American towns and cities, building by building, and reuse the resulting georeferencing data.'
  },
  {
    id: 'state-library-victoria',
    title: 'State Library Victoria georeferencing dashboard',
    url: 'https://wragge.github.io/slv-allmaps/dashboard.html',
    description:
      'Tim Sherratt’s dashboard follows the georeferencing of maps from State Library Victoria. Browse recent additions, see their locations and follow links to the original collection and Allmaps Viewer.',
    screenshot: {
      url: 'https://wragge.github.io/slv-allmaps/dashboard.html#Latest-georeferenced-maps',
      version: 3,
      steps: [{ action: 'click', selector: '.leaflet-container' }],
      waitForSelector: '.leaflet-popup-content img'
    }
  },
  {
    id: 'city-atlas',
    title: 'City Atlas',
    url: 'https://cityatlas.theberlage.nl/',
    description:
      'An atlas by students at the Berlage explores urban transformation in Amsterdam. Created with Allmaps and TU Delft Library, it brings archival maps together with new drawings, design research and exhibitions.',
    screenshot: {
      url: 'https://cityatlas.theberlage.nl/#/documentation/uilenburg/1',
      version: 2,
      waitForSelector: '.ol-viewport',
      delay: 10000
    }
  },
  {
    id: 'allmaps-latest-bot',
    title: 'Allmaps Latest on Bluesky',
    url: 'https://bsky.app/profile/latest.allmaps.org',
    description:
      'A bot by Brandon Liu and Bert Spaan shares recently georeferenced historical maps on Bluesky. Each post combines an old map with present-day OpenStreetMap features, turning open georeferencing data into everyday discoveries.',
    screenshot: {
      url: 'https://bsky.app/profile/latest.allmaps.org/post/3mz3ctea4lg2v',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
      waitForSelector: 'img[alt^="Georeferenced map near"]'
    }
  },
  {
    id: 'kattenburg-atlas',
    title: 'Kattenburg Atlas',
    url: 'https://kattenburg.amsterdamtimemachine.nl/',
    description:
      'Explore the maritime and military history of Kattenburg in Amsterdam through maps, images and stories. Built with Allmaps Slides, the atlas follows the neighbourhood through land reclamation, shipbuilding, war and redevelopment.',
    screenshot: {
      url: 'https://kattenburg.amsterdamtimemachine.nl/1700-1800#s-lands-werf',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
      waitForRender: true,
      delay: 10000
    }
  },
  {
    id: 'rotterdam-time-machine',
    title: 'Rotterdam Time Machine',
    url: 'https://rotterdamtimemachine.nl/',
    description:
      'Travel through Rotterdam’s history with a time slider, historical map overlays and side-by-side comparisons. The project began as a student collaboration between Techniek College Rotterdam, Rotterdam City Archive and TU Delft Library.',
    screenshot: {
      steps: [{ action: 'click', selector: 'button:text-is("Niet nu")' }]
    }
  },
  // {
  //   id: 'open-maps-meeting',
  //   title: 'Open Maps Meeting',
  //   url: 'https://openmapsmeeting.nl/',
  //   description:
  //     'A meeting place for researchers, map curators and developers working with historical maps and open data. The event website brings together the programme, practical resources and a working paper on new approaches to digitized maps.'
  // },
  {
    id: 'csu-historic-map-explorer',
    title: 'CSU Historic Map Explorer',
    url: 'https://historicmaps.colostate.edu/',
    description:
      'Colorado State University Libraries and the Geospatial Centroid make their historical maps searchable and explorable on a modern map. Visitors can filter the collection, compare overlays and adjust their appearance.',
    screenshot: {
      url: 'https://historicmaps.colostate.edu/?f=()&e=(c:~39.027718840211605,-105.52368164062501~,z:8)&l=!((id:~0_p17393coll70-89~))&t=map_tab',
      version: 3,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
      steps: [
        { action: 'waitFor', selector: 'canvas.leaflet-image-layer' },
        { action: 'press', selector: 'body', key: 'Escape' },
        { action: 'click', selector: '#map_tab' },
        { action: 'click', selector: 'label:text-is("Map Points in View")' },
        { action: 'click', selector: 'a[title="Hide MiniMap"]' }
      ],
      delay: 10000
    }
  },
  // {
  //   id: 'iconem-terrain-viewer',
  //   title: 'Iconem Terrain Viewer',
  //   url: 'https://terrain-viewer.iconem.com/',
  //   description:
  //     'Explore terrain, elevation data and historical imagery in a single viewer. Iconem integrates Allmaps to place historical maps alongside modern landscapes, with views for comparing different sources.',
  //   screenshot: {
  //     steps: [{ action: 'click', selector: 'button:text-is("Skip")' }]
  //   }
  // },
  // {
  //   id: 'chengdu-historical-maps',
  //   title: 'Chengdu historical maps',
  //   url: 'https://tools.portkey.click/cd-old-map/',
  //   description:
  //     'Portkey Tools traces changes to Chengdu’s streets and urban form through historical maps. A timeline and transparency slider let visitors compare old maps with the city today.',
  //   screenshot: {
  //     waitForSelector: 'button:text-is("隐")',
  //     delay: 15000
  //   }
  // },
  {
    id: 'necessary-reunions',
    title: 'Necessary Reunions / re:Charted',
    url: 'https://necessaryreunions.org/',
    description:
      'Reconnect maps of early modern Kerala with place names and written records from the Dutch East India Company’s archives. The re:Charted viewer brings together map annotations, georeferenced overlays and a historical gazetteer.',
    screenshot: {
      url: 'https://necessaryreunions.org/viewer?project=neru',
      version: 3,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
      steps: [
        { action: 'waitFor', selector: 'text="Anno" >> nth=0' },
        {
          action: 'click',
          selector:
            'text="Affbeelding van \'t Belegeren en Veroveren der Stadt Couchyn. A:o 1663, onder het bevel van Ryckloff van Goens."'
        },
        { action: 'click', selector: 'button:text-is("Map")' },
        { action: 'waitFor', selector: 'text="MAL_21.json"' },
        { action: 'waitFor', selector: '.leaflet-marker-icon >> nth=0' },
        {
          action: 'click',
          selector: 'button[aria-label="Open map controls"]'
        },
        { action: 'select', selector: '#base-layer', value: 'osm' },
        { action: 'press', selector: '#opacity', key: 'End' },
        {
          action: 'click',
          selector: 'button[aria-label="Close map controls"]'
        },
        { action: 'click', selector: 'button:has(svg.lucide-panel-right)' }
      ],
      waitForSelector: '.leaflet-tile-loaded',
      delay: 15000
    }
  },
  {
    id: 'mapping-chicagoland',
    title: 'Mapping Chicagoland',
    url: 'https://node.uchicago.edu/collection/mapping-chicagoland',
    description:
      'Historical maps from the University of Chicago Library, the Newberry Library and the Chicago History Museum come together in UChicagoNode. An embedded Allmaps Viewer lets visitors compare the city’s streets, neighbourhoods and landscapes with their present-day geography.',
    // Version 2 was captured in the interactive browser with Georeferenced
    // selected and the page scrolled to frame the title and complete viewer.
    screenshot: {
      url: 'https://node.uchicago.edu/item/f5a688dd-056e-4213-97ca-acf2cc8718b7',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      steps: [
        { action: 'click', selector: '[role="tab"]:text-is("Georeferenced")' }
      ]
    }
  },
  {
    id: 'texas-am-digital-collections',
    title: 'Texas A&M Digital Collections',
    url: 'https://digitalcollections.library.tamu.edu/',
    description:
      'Texas A&M University Libraries adds a georeferenced map view to its digital collection records. Visitors can compare historical maps with modern geography in Allmaps Viewer and contribute new georeferencing that appears automatically in the collection portal.',
    // Version 2 was captured in the interactive browser with Georeferenced Map
    // selected and the page scrolled to frame the embedded viewer.
    screenshot: {
      url: 'https://digitalcollections.library.tamu.edu/do/d337e432-0dbd-44e7-9f82-6aeb1cd18c47',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      steps: [{ action: 'click', selector: '#nav-allmaps-tab' }]
    }
  },
  {
    id: 'big-ten-geoportal',
    title: 'Big Ten Academic Alliance Geoportal',
    url: 'https://geo.btaa.org/',
    description:
      'Discover historical maps across university collections, view Allmaps overlays inside catalogue records and open maps in Editor to contribute control points. Search filters distinguish maps with existing overlays from those still waiting to be georeferenced.',
    // Version 2 was captured in the interactive browser after the portal's
    // browser verification, with Map Overlay selected on the Boston record.
    screenshot: {
      url: 'https://geo.btaa.org/resources/p16022coll205:552',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      steps: [{ action: 'click', selector: '#resource-viewer-allmaps-tab' }],
      delay: 10000
    }
  },
  {
    id: 'georgia-coast-atlas',
    title: 'Georgia Coast Atlas',
    url: 'https://georgiacoastatlas.org/',
    description:
      'Emory University’s digital atlas explores the ecology, geography and history of Georgia’s coast. Allmaps adds historical map overlays to a collection of maps, photographs, videos and scholarly stories.',
    screenshot: {
      url: 'https://georgiacoastatlas.org/collections/maps/glynn-1938',
      version: 3,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
      steps: [
        { action: 'press', selector: '[id^="opacity-"]', key: 'End' },
        { action: 'press', selector: '[id^="opacity-"]', key: 'PageDown' },
        { action: 'press', selector: '[id^="opacity-"]', key: 'PageDown' },
        { action: 'click', selector: 'h1' }
      ],
      delay: 15000
    }
  },
  // Temporarily hidden while the website deployment is paused.
  // {
  //   id: 'suriname-time-machine',
  //   title: 'Suriname Time Machine — Images',
  //   url: 'https://images.surinametijdmachine.org/',
  //   description:
  //     'Explore Suriname through photographs, prints, paintings and objects from the Rijksmuseum. A timeline, place search and historical map overlays connect the collection to locations across Suriname and Paramaribo, with Allmaps bringing archival maps into the viewer.',
  //   screenshot: {
  //     url: 'https://images.surinametijdmachine.org/en?from=1400&to=2013&z=7&lat=4.5000&lng=-55.5000&img=1&sc=1&pc=1&fc=1&hm=suriname',
  //     delay: 15000
  //   }
  // },
  {
    id: 'gent-gemapt',
    title: 'Gent Gemapt',
    url: 'https://kaart.gentgemapt.be/',
    description:
      'Explore Ghent through historical maps, photographs and heritage collections. Allmaps overlays connect the changing city to its streets, buildings and stories, while a timeline and thematic layers reveal different aspects of local history.',
    // Version 2 was framed manually with Horenbault's map and the timeline
    // set to 1619, zoomed into Ghent. The viewer does not save this in its URL.
    screenshot: {
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 }
    }
  },
  // {
  //   id: 'utrecht-in-perspectief',
  //   title: 'Utrecht in Perspectief',
  //   url: 'https://utrechtinperspectief.nl/',
  //   description:
  //     'Historical panoramas become a starting point for exploring Utrecht’s buildings and skyline. The Utrechts Archief and Utrecht University Library connect city views, archival records and historical maps, using the Allmaps tile service to display map layers.',
  //   screenshot: {
  //     steps: [{ action: 'click', selector: 'button.Cookie__button' }]
  //   }
  // },
  // {
  //   id: 'leeds-library-floorplans',
  //   title: 'University of Leeds Library Floorplans',
  //   url: 'https://floorplans.library.leeds.ac.uk/brotherton/m2',
  //   description:
  //     'Find books, study spaces and facilities across the University of Leeds libraries. Allmaps helps georeference floor plans and transform shelf locations into geographic coordinates, putting its tools to work for everyday navigation inside buildings.'
  // },
  // {
  //   id: 'toponym-extractor',
  //   title: 'Toponym Extractor',
  //   url: 'https://davidrumseymapcenter.github.io/toponym-extractor/',
  //   description:
  //     'Turn place names detected on scanned maps into geographic data. This tool from the David Rumsey Map Center combines MapReader text detections with Allmaps georeferencing to calculate coordinates, preview results on a historical map and export them as CSV or GeoJSON.'
  // },
  {
    id: 'historical-atlas-polish-towns',
    title: 'Historical Atlas of Polish Towns',
    url: 'https://wweronikad.github.io/serwis-ahmp-infrastruktura/',
    description:
      'Explore the changing geography of Polish towns through historical maps, photographs and descriptions. This research prototype uses the Allmaps MapLibre plugin for map overlays, with timelines, split-screen comparisons and links back to the original atlas sheets.',
    screenshot: {
      steps: [
        {
          action: 'click',
          selector: 'a:has-text("Otwórz Atlas interaktywny")'
        }
      ],
      delay: 8000
    }
  },
  {
    id: 'gravity-at-sea',
    title: 'Gravity at Sea',
    url: 'https://tu-delft-heritage.github.io/gravity-expeditions-app/',
    description:
      'Follow the submarine K-XVIII from Den Helder to Surabaya on Felix Andries Vening Meinesz’s 1934–1935 gravity-measuring expedition. TU Delft Library brings the journey to life through historical maps, photographs and stories in Allmaps Slides.',
    // Version 2 was captured in the interactive browser with the Atlantic map
    // panned to fill the frame while retaining the expedition route.
    screenshot: {
      url: 'https://tu-delft-heritage.github.io/gravity-expeditions-app/#spreading-ridge',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 }
    }
  },
  {
    id: 'aggieland-through-time',
    title: 'Aggieland Through Time',
    url: 'https://exhibits.library.tamu.edu/aggieland-through-time/',
    description:
      'Explore the growth of the Texas A&M campus through its buildings, archival photographs and historical maps. This university library exhibit combines a date slider and building records with Allmaps Leaflet overlays to reveal how the campus has changed.',
    // Version 2 was framed manually with the historic campus plan enabled,
    // aerial photographs disabled, markers ungrouped and Old Main selected.
    screenshot: {
      url: 'https://exhibits.library.tamu.edu/aggieland-through-time/map/',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 }
    }
  },
  {
    id: 'art-and-empire',
    title: 'Art & Empire',
    url: 'https://nulib-ds.github.io/art-and-empire/displaying-empire/index.html#panel-map',
    description:
      'Northwestern University Libraries connects art, architecture and imperial history in a digital exhibition. A historical map of British India brings cities, landmarks and collection objects into geographic context through Canopy’s Allmaps integration.',
    screenshot: {
      steps: [
        { action: 'click', selector: 'a:text-is("Map of British India")' },
        { action: 'hover', selector: '.leaflet-container >> nth=0' }
      ],
      delay: 10000
    }
  },
  {
    id: 'csu-groundwater-explorer',
    title: 'CSU Groundwater Data Explorer',
    url: 'https://geospatialcentroid.github.io/csu_groundwater_data_explorer/',
    description:
      'Explore groundwater information alongside historical maps of Colorado. Colorado State University’s Geospatial Centroid uses the Allmaps Leaflet plugin to place older map sheets in the same view as contemporary geographic data.',
    // Version 2 was framed manually: Morgan County only, comparison divider
    // fully right, footprints hidden and well B4-56-29acc selected.
    screenshot: {
      url: 'https://geospatialcentroid.github.io/csu_groundwater_data_explorer/?e=(c:~40.193298844191276,-103.81153106689455~,z:11)',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      steps: [
        { action: 'click', selector: 'button:text-is("Close") >> nth=-1' },
        { action: 'click', selector: '#layer_but_0' }
      ],
      delay: 10000
    }
  },
  {
    id: 'goudse-kaarten-kabinet',
    title: 'Goudse Kaarten Kabinet',
    url: 'https://www.goudatijdmachine.nl/kaartenkabinet/',
    description:
      'Gouda Tijdmachine brings historical maps from different collections together to explore the city’s changing streets and waterways. Built on Rotterdam Time Machine, the viewer uses Allmaps georeferencing for overlays and comparisons across time.',
    screenshot: {
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      steps: [{ action: 'click', selector: 'button:text-is("Niet nu")' }],
      delay: 15000
    }
  },
  {
    id: 'agsl-geodiscovery',
    title: 'AGSL GeoDiscovery',
    url: 'https://geodiscovery.uwm.edu/',
    description:
      'The American Geographical Society Library at the University of Wisconsin–Milwaukee makes maps and geographic datasets discoverable through one portal. Its Blacklight Allmaps integration connects historical map records with georeferencing and geographic viewing.',
    screenshot: {
      url: 'https://geodiscovery.uwm.edu/catalog/p16022coll205:552',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      steps: [
        { action: 'click', selector: '#georeferenced-viewer' },
        { action: 'click', selector: 'a[title="Zoom in"]' }
      ],
      delay: 10000
    }
  },
  {
    id: 'soduco-paris-atlases',
    title: 'SODUCO: historical atlases of Paris',
    url: 'https://soduco.geohistoricaldata.org/AllmapsAnnotations/',
    description:
      'The SODUCO research project publishes georeferencing data for the Verniquet atlas and successive municipal atlases of Paris. Allmaps annotations and Viewer links make these sources available for exploring the city’s historical geography and social change.',
    // Version 2 was framed manually with the sidebar closed and the page
    // scrolled to show the complete Verniquet atlas and Allmaps Viewer link.
    screenshot: {
      version: 2,
      viewport: { width: 1536, height: 1024, deviceScaleFactor: 1 }
    }
  },
  {
    id: 'argo',
    title: 'ARGO — American Revolutionary Geographies Online',
    url: 'https://www.argomaps.org/',
    description:
      'Explore the American Revolutionary era through historical maps, people and interpretive stories. ARGO brings partner collections together and connects map records to Allmaps for georeferencing and viewing them against modern geography.',
    // ARGO opens georeferenced maps in Allmaps Viewer. This is the view
    // linked from its Boston (1780) record, commonwealth:3f462x39c.
    screenshot: {
      url: `${toolIdentities.viewer.href}/?url=https%3A%2F%2Fark.digitalcommonwealth.org%2Fark%3A%2F50959%2F3f462x39c%2Fmanifest`,
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      waitForRender: true
    }
  },
  {
    id: 'mare-nostrum-lab',
    title: 'Mare Nostrum LAB',
    url: 'https://mn.cenagis.edu.pl/',
    description:
      'An archaeological research platform developed by Jagiellonian University and Warsaw University of Technology. Its customized Arches environment brings Allmaps into workflows for connecting excavation plans and historical imagery with geographic context.',
    // Version 2 was framed manually in the public Arches search: context
    // MAL_TT_I_4 selected, zoomed out twice from its extent, panned to center
    // the excavation and opened the map overlays panel.
    screenshot: {
      url: 'https://map.mn.cenagis.edu.pl/search?paging-filter=1&tiles=true',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 }
    }
  },
  {
    id: 'source-library',
    title: 'Source Library — Maps & Cartography',
    url: 'https://sourcelibrary.org/gallery/collections/maps-cartography',
    description:
      'Discover maps tucked into digitized books, from Renaissance atlases to city plans and travel accounts. Source Library’s map records link to Allmaps Editor, inviting readers to georeference the original IIIF materials.',
    screenshot: {
      steps: [{ action: 'click', selector: 'button:text-is("Decline")' }],
      delay: 10000
    }
  },
  {
    id: 'schelde-gemapt',
    title: 'Schelde Gemapt',
    url: 'https://kaart.scheldegemapt.be/#c=4.1840,51.0656,8.9&l=gk',
    description:
      'Explore the changing landscape of the Scheldt valley through historical maps, cadastral plans and photographs. Developed by the Artemis research project, the viewer combines a timeline and map comparisons with Allmaps overlays and georeferencing contributed by volunteers.',
    screenshot: {
      url: 'https://kaart.scheldegemapt.be/#c=4.2042,51.0847,11.4&l=gk',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      delay: 10000
    }
  },
  {
    id: 'ferrovias-do-brasil',
    title: 'Ferrovias do Brasil',
    url: 'https://ferrovias-do-brasil.github.io/ferrovias-do-brasil/',
    description:
      'Follow the development of Brazil’s railways, beginning with the networks of São Paulo state. An interactive timeline traces changing routes and stations, while Allmaps overlays a 1912 railway map to connect historical sources with the landscape today.',
    screenshot: {
      url: 'https://ferrovias-do-brasil.github.io/ferrovias-do-brasil/?ano=1912&antigo=1#mapa=6.8/-22.7/-47.5',
      version: 2,
      viewport: { width: 1440, height: 960, deviceScaleFactor: 1 },
      steps: [
        { action: 'click', selector: 'button:text-is("Ocultar painel")' },
        {
          action: 'press',
          selector: 'input[aria-label="Opacidade do mapa antigo"]',
          key: 'End'
        }
      ],
      waitForRender: true,
      delay: 10000
    }
  },
  {
    id: 'iiif-pyramid',
    title: 'Allmaps IIIF Pyramid',
    url: 'https://pages.allmaps.org/iiif-pyramid/',
    description:
      'A linked image viewer and tile pyramid show how IIIF delivers large maps and artworks at different resolutions. Created by Jules Schoonman, the explorer uses Allmaps rendering to let visitors inspect tiles, compare zoom levels and follow their position through the pyramid.',
    screenshot: {
      url: 'https://pages.allmaps.org/iiif-pyramid/?url=https%3A%2F%2Famsterdamtimemachine.github.io%2Fberckenrode-iiif%2FKZL_W_X_020',
      viewport: { width: 1440, height: 960, deviceScaleFactor: 2 },
      waitForRender: true
    }
  }
]

export function getShowcaseScreenshot(project: ShowcaseProject) {
  return defineScreenshot({
    url: project.url,
    slug: `showcase-${project.id}`,
    viewport: { width: 1200, height: 800, deviceScaleFactor: 2 },
    delay: 5000,
    ...project.screenshot
  })
}
