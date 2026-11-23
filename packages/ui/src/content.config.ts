import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        sections: z
          .array(
            z.union([
              z.string(),
              z.object({ title: z.string(), children: z.array(z.string()) })
            ])
          )
          .optional()
      })
    })
  })
}
