import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import tailwind from '@astrojs/tailwind'
import svelte from '@astrojs/svelte'

import ports from '../../ports.json'

// https://astro.build/config
export default defineConfig({
  server: { port: ports.docs, host: true },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    starlight({
      title: 'Allmaps Docs',
      social: {
        github: 'https://github.com/allmaps/allmaps'
      },
      sidebar: [
        {
          label: 'Guides',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Example Guide', link: '/guides/example/' }
          ]
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' }
        }
      ],
      customCss: [
        './src/css/tailwind.css',
        './src/css/fonts.css',
        './src/css/starlight.css'
      ]
    }),

    svelte()
  ]
  // Process images with sharp: https://docs.astro.build/en/guides/assets/#using-sharp
  // image: {
  //   service: {
  //     entrypoint: 'astro/assets/services/sharp'
  //   }
  // }
})
