import { baseEnvSchema } from './base.js'
import { databaseEnvSchema } from './database.js'
import { urlsEnvSchema } from './urls.js'

export const apiEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(urlsEnvSchema)
