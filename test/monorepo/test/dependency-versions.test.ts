import { describe, expect, test } from 'vitest'

import {
  getParsedPackageJsons,
  collectDependencyVersions,
  addPackageName
} from '../lib/shared.ts'

// Check all versions of all dependencies.
// Ideally, only one version of each dependency is used
// accross the monorepo.

const parsedPackageJsons = await getParsedPackageJsons()

const allDependencies = collectDependencyVersions(
  [...parsedPackageJsons.entries()]
    .map(([name, { dependencies, devDependencies }]) => [
      addPackageName(dependencies, name),
      addPackageName(devDependencies, name)
    ])
    .flat()
)

describe(`Dependency versions`, () => {
  for (const [dependency, versions] of allDependencies.entries()) {
    test(`${dependency} should have one version`, () => {
      const versionInfo = [...versions]
        .map(
          ([version, packageNames]) =>
            `\n  ${version}: ${[...packageNames].join(', ')}`
        )
        .join('')

      expect(
        versions.size,
        `Expected 1 version but found ${versions.size}:${versionInfo}`
      ).to.equal(1)
    })
  }
})
