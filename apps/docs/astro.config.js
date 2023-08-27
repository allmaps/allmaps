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
      logo: {
        src: './src/assets/allmaps-logo.svg'
      },
      social: {
        github: 'https://github.com/allmaps/allmaps'
      },
      editLink: {
        // Pick main or develop branch
        baseUrl: 'https://github.com/allmaps/allmaps/tree/develop/apps/docs/'
      },
      sidebar: [
        { label: 'Introduction', link: '/introduction/' },
        { label: 'Get Started', link: '/get-started/' },
        { label: 'FAQ', link: '/faq/' },
        { label: 'Glossary', link: '/glossary/' },
        {
          label: 'Guides',
          // items: [{ label: 'Data', link: '/data/' }]
          autogenerate: {
            directory: 'guides'
          }
        },
        {
          label: 'Tutorials',
          items: [
            { label: 'For Historians', link: '/tutorials/for-historians/' },
            { label: 'For Students', link: '/tutorials/for-students/' },
            { label: 'For Developers', link: '/tutorials/for-developers/' },
            { label: 'For Curators', link: '/tutorials/for-curators/' }
          ]
        },
        {
          label: 'Reference',
          items: [
            {
              label: 'REST API',
              autogenerate: {
                directory: 'reference/api'
              }
            },
            {
              label: 'Packages',
              autogenerate: {
                directory: 'reference/packages'
              }
            },
            {
              label: 'Apps',
              autogenerate: {
                directory: 'reference/apps'
              }
            }
          ]
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
