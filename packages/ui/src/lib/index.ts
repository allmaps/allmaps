import dataStore from '$lib/shared/stores/data.js'
import paramStore from '$lib/shared/stores/param.js'
import urlStore from '$lib/shared/stores/url.js'

import Banner from '$lib/components/Banner.svelte'
import Checkbox from '$lib/components/Checkbox.svelte'
import Collection from '$lib/components/Collection.svelte'
import Combobox from '$lib/components/Combobox.svelte'
import Copy from '$lib/components/Copy.svelte'
import Footer from '$lib/components/Footer.svelte'
import Geocoder from '$lib/components/Geocoder.svelte'
import Grid from '$lib/components/Grid.svelte'
import Header from '$lib/components/Header.svelte'
import IIIFLogo from '$lib/components/images/IIIFLogo.svelte'
import Kbd from '$lib/components/Kbd.svelte'
import Loading from '$lib/components/Loading.svelte'
import LoadingSmall from '$lib/components/LoadingSmall.svelte'
import Logo from '$lib/components/Logo.svelte'
import MapMonster from '$lib/components/MapMonster.svelte'
import Modal from '$lib/components/Modal.svelte'
import MovingMapsBackground from '$lib/components/MovingMapsBackground.svelte'
import NorthArrow from './components/NorthArrow.svelte'
import Popover from './components/Popover.svelte'
import ProjectionPicker from '$lib/components/ProjectionPicker.svelte'
import Select from '$lib/components/Select.svelte'
import SelectDistortionMeasure from '$lib/components/SelectDistortionMeasure.svelte'
import SelectTransformation from '$lib/components/SelectTransformation.svelte'
import Slider from '$lib/components/Slider.svelte'
import Stats from '$lib/components/Stats.svelte'
import Switch from '$lib/components/Switch.svelte'
import Thumbnail from '$lib/components/Thumbnail.svelte'
import URLInput from '$lib/components/URLInput.svelte'
import URLType from '$lib/components/URLType.svelte'

import BringMapsForward from '$lib/components/icons/BringMapsForward.svelte'
import BringMapsToFront from '$lib/components/icons/BringMapsToFront.svelte'
import SendMapsBackward from '$lib/components/icons/SendMapsBackward.svelte'
import SendMapsToBack from '$lib/components/icons/SendMapsToBack.svelte'

import Helmert from '$lib/icons/transformations/Helmert.svelte'
import Polynomial1 from '$lib/icons/transformations/Polynomial1.svelte'
import Polynomial2 from '$lib/components/icons/transformations/Polynomial2.svelte'
import Polynomial3 from '$lib/components/icons/transformations/Polynomial3.svelte'
import Projective from '$lib/components/icons/transformations/Projective.svelte'
import Straight from '$lib/components/icons/transformations/Straight.svelte'
import ThinPlateSpline from '$lib/icons/transformations/ThinPlateSpline.svelte'

export {
  Banner,
  Checkbox,
  Collection,
  Combobox,
  Copy,
  Footer,
  Geocoder,
  Grid,
  Header,
  IIIFLogo,
  Kbd,
  Loading,
  LoadingSmall,
  Logo,
  MapMonster,
  Modal,
  MovingMapsBackground,
  NorthArrow,
  Popover,
  ProjectionPicker,
  Select,
  SelectDistortionMeasure,
  SelectTransformation,
  Slider,
  Stats,
  Switch,
  Thumbnail,
  URLInput,
  URLType,
  urlStore,
  dataStore,
  paramStore,
  BringMapsForward,
  BringMapsToFront,
  SendMapsBackward,
  SendMapsToBack,
  Helmert,
  Polynomial1,
  Polynomial2,
  Polynomial3,
  Projective,
  Straight,
  ThinPlateSpline
}

export type { MapMonsterColor, MapMonsterMood } from '$lib/shared/types.js'
export type { SelectBaseItem, ComboboxBaseItem } from '$lib/shared/types.js'
