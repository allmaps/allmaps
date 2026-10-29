import '@allmaps/maplibre'

// test/readme.setup.ts
import { afterEach, beforeEach } from 'vitest'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  container.id = 'map'
  container.style.width = '400px'
  container.style.height = '300px'
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})
