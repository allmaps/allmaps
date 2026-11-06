import { expect, test } from 'vitest'

import {
  getHeroTransitionDirection,
  isMaskHeroPathname
} from '../src/lib/hero/navigation.js'

const environment = { supported: true, visible: true, reducedMotion: false }
const from = {
  route: { id: '/(content)/about' },
  url: new URL('https://allmaps.org/about')
}
const to = {
  route: { id: '/(content)/partners' },
  url: new URL('https://allmaps.org/partners')
}

test('only mask-hero destinations use client navigation in the header', () => {
  expect(isMaskHeroPathname('/get-started')).toBe(true)
  expect(isMaskHeroPathname('/partners/')).toBe(true)
  expect(isMaskHeroPathname('/')).toBe(false)
  expect(isMaskHeroPathname('/iiif-partnership')).toBe(true)
  expect(isMaskHeroPathname('/iiif-partnership/')).toBe(true)
})

test('ordinary navigation and browser Forward slide forward; Back reverses', () => {
  expect(
    getHeroTransitionDirection({ from, to, type: 'link' }, environment)
  ).toBe('forward')
  expect(
    getHeroTransitionDirection(
      { from, to, type: 'popstate', delta: 1 },
      environment
    )
  ).toBe('forward')
  expect(
    getHeroTransitionDirection(
      { from, to, type: 'popstate', delta: -1 },
      environment
    )
  ).toBe('back')
})

test.each([{ supported: false }, { visible: false }, { reducedMotion: true }])(
  'uses normal navigation when motion is unavailable: %o',
  (override) => {
    expect(
      getHeroTransitionDirection(
        { from, to, type: 'link' },
        { ...environment, ...override }
      )
    ).toBeUndefined()
  }
)

test('the partnership transitions with compact heroes, including Back and Forward', () => {
  const partnership = {
    route: { id: '/iiif-partnership' },
    url: new URL('https://allmaps.org/iiif-partnership')
  }
  for (const [origin, destination] of [
    [from, partnership],
    [partnership, to]
  ]) {
    expect(
      getHeroTransitionDirection(
        { from: origin, to: destination, type: 'link' },
        environment
      )
    ).toBe('forward')
    expect(
      getHeroTransitionDirection(
        { from: origin, to: destination, type: 'popstate', delta: -1 },
        environment
      )
    ).toBe('back')
    expect(
      getHeroTransitionDirection(
        { from: origin, to: destination, type: 'popstate', delta: 1 },
        environment
      )
    ).toBe('forward')
  }
  expect(
    getHeroTransitionDirection(
      {
        from: partnership,
        to: {
          ...partnership,
          url: new URL('https://allmaps.org/iiif-partnership?print#faq')
        },
        type: 'link'
      },
      environment
    )
  ).toBeUndefined()
})

test('navigation requires heroes on both pages and excludes the homepage', () => {
  const homepage = {
    route: { id: '/' },
    url: new URL('https://allmaps.org/')
  }
  for (const navigation of [
    { from, to: homepage, type: 'link' },
    { from: homepage, to, type: 'link' },
    { from: null, to, type: 'link' }
  ]) {
    expect(getHeroTransitionDirection(navigation, environment)).toBeUndefined()
  }
})

test('anchors, queries, and trailing slashes do not animate the same page', () => {
  for (const url of ['/about#values', '/about?example=1', '/about/']) {
    expect(
      getHeroTransitionDirection(
        {
          from,
          to: { ...from, url: new URL(url, 'https://allmaps.org') },
          type: 'link'
        },
        environment
      )
    ).toBeUndefined()
  }
})
