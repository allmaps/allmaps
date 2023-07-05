import urlStore from './shared/stores/url.js'
import dataStore from './shared/stores/data.js'
import paramStore from './shared/stores/param.js'

import Logo from '$lib/components/Logo.svelte'
import Header from '$lib/components/Header.svelte'
import Navigation from '$lib/components/Navigation.svelte'
import URLInput from '$lib/components/URLInput.svelte'
import URLType from '$lib/components/URLType.svelte'
import Loading from '$lib/components/Loading.svelte'
import Dial from '$lib/components/Dial.svelte'
import Copy from '$lib/components/Copy.svelte'
import MapMonster from '$lib/components/MapMonster.svelte'

// Arrange icons
import BringToFront from '$lib/components/icons/BringToFront.svelte'
import BringForward from '$lib/components/icons/BringForward.svelte'
import SendBackward from '$lib/components/icons/SendBackward.svelte'
import SendToBack from '$lib/components/icons/SendToBack.svelte'

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
  Navigation,
  URLInput,
  URLType,
  Loading,
  Dial,
  Copy,
  MapMonster,

  // Arrange icons
  BringToFront,
  BringForward,
  SendBackward,
  SendToBack,

  // Transformation icons
  Helmert,
  Polynomial1,
  Polynomial2,
  Polynomial3,
  Projective,
  ThinPlateSpline
}
