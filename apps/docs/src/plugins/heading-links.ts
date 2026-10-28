import { satteriHeadingIdsPlugin } from '@astrojs/markdown-satteri'
import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri'

const headingLinks = [
  satteriHeadingIdsPlugin(),
  {
    name: 'allmaps-heading-links',
    element: {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      visit(heading) {
        const id = heading.properties?.id
        if (typeof id !== 'string' || !id) return

        return {
          ...heading,
          children: [
            {
              type: 'element',
              tagName: 'a',
              properties: {
                class: 'heading-anchor',
                'aria-label': 'Link to this section',
                href: `#${id}`
              },
              children: [
                {
                  type: 'element',
                  tagName: 'svg',
                  properties: {
                    class: 'heading-anchor-icon',
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
              ]
            },
            ...heading.children
          ]
        }
      }
    }
  }
] satisfies NonNullable<SatteriProcessorOptions['hastPlugins']>

export default headingLinks
