import { z } from 'zod'

export const PointSchema = z.tuple([z.number(), z.number()])

export const ImageServiceSchema = z.enum([
  'ImageService1',
  'ImageService2',
  'ImageService3'
])
