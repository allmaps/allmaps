// import { describe, it } from 'mocha'
// import chai, { expect } from 'chai'

import axios from 'axios'

import { parse } from '@allmaps/annotation'
import { createTransformer, polygonToWorld } from '../index.js'

async function runTests (url) {
  const response = await axios.get(url)
  const annotation = response.data

  const maps = parse(annotation)
  const map = maps[0]

  const transformArgs = createTransformer(map.gcps)
  const geojson = polygonToWorld(transformArgs, map.pixelMask)

  console.log(JSON.stringify(geojson, null, 2))
}

// const annotationUrl = 'https://annotations.allmaps.org/images/wVAswZEjDuXggbBh'
// const annotationUrl = 'https://annotations.allmaps.org/images/2MVa8QBQ7FqUYfnR'
// const annotationUrl = 'https://annotations.allmaps.org/images/QMvWyWMesK7Jbg8q'
const annotationUrl = 'https://annotations.allmaps.org/images/9FdzQJiiDKDGG6F6'

runTests(annotationUrl)
