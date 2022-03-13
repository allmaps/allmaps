import fs from 'fs'

import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import ajvErrors from 'ajv-errors'
import standaloneCode from 'ajv/dist/standalone/index.js'

const schemaMap = JSON.parse(fs.readFileSync('./schemas/map.json'))
const schemaAnnotation = JSON.parse(
  fs.readFileSync('./schemas/annotation.json')
)
const schemaAnnotations = JSON.parse(
  fs.readFileSync('./schemas/annotations.json')
)

const ajv = new Ajv({
  schemas: [schemaMap, schemaAnnotation, schemaAnnotations],
  allErrors: true,
  code: { source: true, esm: true }
})

addFormats(ajv, ['uri'])
ajvErrors(ajv)

let moduleCode = standaloneCode(ajv, {
  validateMap: 'https://allmaps.org/annotation/schemas/map.json',
  validateAnnotation: 'https://allmaps.org/annotation/schemas/annotation.json',
  validateAnnotations: 'https://allmaps.org/annotation/schemas/annotations.json'
})

console.log(moduleCode)
