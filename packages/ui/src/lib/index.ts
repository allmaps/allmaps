import dataStore from './shared/stores/data.js'
import paramStore from './shared/stores/param.js'
import urlStore from './shared/stores/url.js'

import Banner from '$lib/components/Banner.svelte'
import Collection from '$lib/components/Collection.svelte'
import Copy from '$lib/components/Copy.svelte'
import Dial from '$lib/components/Dial.svelte'
import Header from '$lib/components/Header.svelte'
import Loading from '$lib/components/Loading.svelte'
import Logo from '$lib/components/Logo.svelte'
import MapMonster from '$lib/components/MapMonster.svelte'
import NorthArrow from '$lib/components/NorthArrow.svelte'
import Geocoder from '$lib/components/Geocoder.svelte'
import Slider from '$lib/components/Slider.svelte'
import Stats from '$lib/components/Stats.svelte'
import Thumbnail from '$lib/components/Thumbnail.svelte'
import URLInput from '$lib/components/URLInput.svelte'
import URLType from '$lib/components/URLType.svelte'

// Arrange icons
import BringMapsToFront from '$lib/components/icons/BringMapsToFront.svelte'
import BringMapsForward from '$lib/components/icons/BringMapsForward.svelte'
import SendMapsBackward from '$lib/components/icons/SendMapsBackward.svelte'
import SendMapsToBack from '$lib/components/icons/SendMapsToBack.svelte'

// Transformation icons
import Helmert from '$lib/components/icons/transformations/Helmert.svelte'
import Polynomial1 from '$lib/components/icons/transformations/Polynomial1.svelte'
import Polynomial2 from '$lib/components/icons/transformations/Polynomial2.svelte'
import Polynomial3 from '$lib/components/icons/transformations/Polynomial3.svelte'
import Projective from '$lib/components/icons/transformations/Projective.svelte'
import ThinPlateSpline from '$lib/components/icons/transformations/ThinPlateSpline.svelte'
import Straight from './components/icons/transformations/Straight.svelte'

export { urlStore, dataStore, paramStore }

export {
  Banner,
  Collection,
  Copy,
  Dial,
  Header,
  Loading,
  Logo,
  MapMonster,
  NorthArrow,
  Geocoder,
  Slider,
  Stats,
  Thumbnail,
  URLInput,
  URLType,

  // Arrange icons
  BringMapsToFront,
  BringMapsForward,
  SendMapsBackward,
  SendMapsToBack,

  // Transformation icons
  Helmert,
  Polynomial1,
  Polynomial2,
  Polynomial3,
  Projective,
  ThinPlateSpline,
  Straight
}

export * from './shared/types.js'
