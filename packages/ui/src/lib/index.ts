import urlStore from './shared/stores/url.js'
import dataStore from './shared/stores/data.js'
import paramStore from './shared/stores/param.js'

import Logo from '$lib/components/Logo.svelte'
import Header from '$lib/components/Header.svelte'
import URLInput from '$lib/components/URLInput.svelte'
import URLType from '$lib/components/URLType.svelte'
import Loading from '$lib/components/Loading.svelte'
import Dial from '$lib/components/Dial.svelte'
import Copy from '$lib/components/Copy.svelte'
import MapMonster from '$lib/components/MapMonster.svelte'

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

export { urlStore, dataStore, paramStore }

export {
  Logo,
  Header,
  URLInput,
  URLType,
  Loading,
  Dial,
  Copy,
  MapMonster,

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
  ThinPlateSpline
}

export * from './shared/types.js'
