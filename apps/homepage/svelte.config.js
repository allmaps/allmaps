import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'

const headingAnchorIcon = {
  type: 'element',
  tagName: 'svg',
  properties: {
    className: ['heading-anchor-icon'],
    'aria-hidden': 'true',
    fill: 'currentColor',
    height: '1em',
    viewBox: '0 0 256 256',
    width: '1em',
    xmlns: 'http://www.w3.org/2000/svg'
  },
  children: [
    {
      type: 'element',
      tagName: 'path',
      properties: {
        d: 'M165.66,90.34a8,8,0,0,1,0,11.32l-64,64a8,8,0,0,1-11.32-11.32l64-64A8,8,0,0,1,165.66,90.34ZM215.6,40.4a56,56,0,0,0-79.2,0L106.34,70.45a8,8,0,0,0,11.32,11.32l30.06-30a40,40,0,0,1,56.57,56.56l-30.07,30.06a8,8,0,0,0,11.31,11.32L215.6,119.6a56,56,0,0,0,0-79.2ZM138.34,174.22l-30.06,30.06a40,40,0,1,1-56.56-56.57l30.05-30.05a8,8,0,0,0-11.32-11.32L40.4,136.4a56,56,0,0,0,79.2,79.2l30.06-30.07a8,8,0,0,0-11.32-11.31Z'
      },
      children: []
    }
  ]
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.svx'],
  preprocess: [
    vitePreprocess({
      postcss: true
    }),
    mdsvex({
      extensions: ['.svx'],
      rehypePlugins: [
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'prepend',
            content: headingAnchorIcon,
            properties: {
              className: ['heading-anchor'],
              'aria-label': 'Link to this section'
            }
          }
        ]
      ]
    })
  ],
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      precompress: false
    }),
    env: {
      dir: '../..'
    },
    alias: {
      $lib: './src/lib',
      '$lib/*': './src/lib/*'
    }
  }
}

export default config
