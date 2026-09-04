import Shape0 from './shapes/Shape0.svelte'
import Shape1 from './shapes/Shape1.svelte'
import Shape2 from './shapes/Shape2.svelte'
import Shape3 from './shapes/Shape3.svelte'
import Shape4 from './shapes/Shape4.svelte'

import Happy from './faces/Happy.svelte'
import Sad from './faces/Sad.svelte'
import Confused from './faces/Confused.svelte'
import Excited from './faces/Excited.svelte'
import Neutral from './faces/Neutral.svelte'

import type { MapMonsterMood } from '$lib/shared/types.js'

// Generated from map-monster-grid.svg. Bounds include the shape stroke.
export const mapMonsterShapes = [
  {
    component: Shape0,
    viewBox: '-0.57 0.41 101.14 99.18',
    width: 101.14,
    height: 99.18
  },
  {
    component: Shape1,
    viewBox: '0.41 0.41 100.16 99.18',
    width: 100.16,
    height: 99.18
  },
  {
    component: Shape2,
    viewBox: '9.32 0.41 81.25 99.18',
    width: 81.25,
    height: 99.18
  },
  {
    component: Shape3,
    viewBox: '0.43 0.41 98.46 99.18',
    width: 98.46,
    height: 99.18
  },
  {
    component: Shape4,
    viewBox: '-0.57 0.41 101.14 99.18',
    width: 101.14,
    height: 99.18
  }
] as const

export const mapMonsterFaces = {
  happy: Happy,
  sad: Sad,
  confused: Confused,
  excited: Excited,
  neutral: Neutral
} satisfies Record<MapMonsterMood, typeof Happy>
