import fs from 'fs'

import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import ajvErrors from 'ajv-errors'
import standaloneCode from 'ajv/dist/standalone/index.js'

const schemaMap = JSON.parse(fs.readFileSync('./schemas/map.json'))
const schemaMaps = JSON.parse(fs.readFileSync('./schemas/maps.json'))

const schemaAnnotation = JSON.parse(
  fs.readFileSync('./schemas/annotation.json')
)
const schemaAnnotationPage = JSON.parse(
  fs.readFileSync('./schemas/annotation-page.json')
)

const ajv = new Ajv({
  schemas: [schemaMap, schemaMaps, schemaAnnotation, schemaAnnotationPage],
  allErrors: true,
  code: { source: true, esm: true }
})

addFormats(ajv, ['uri'])
ajvErrors(ajv)

let moduleCode = standaloneCode(ajv, {
  validateMap: 'https://allmaps.org/annotation/schemas/map.json',
  validateMaps: 'https://allmaps.org/annotation/schemas/maps.json',
  validateAnnotation: 'https://allmaps.org/annotation/schemas/annotation.json',
  validateAnnotationPage:
    'https://allmaps.org/annotation/schemas/annotation-page.json'
})

console.log(moduleCode)
