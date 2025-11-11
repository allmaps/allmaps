import { describe, expect, test } from 'vitest'

import { getParsedPackageJsons } from '../lib/shared.ts'

// Tests Allmaps dependencies for cyclic dependencies

const parsedPackageJsons = await getParsedPackageJsons()

type AllmapsModule = {
  name: string
  dependencies: AllmapsModule[]
}

const allmapsModules: Record<string, AllmapsModule> = {}

for (const { name } of parsedPackageJsons.values()) {
  if (!(name in allmapsModules)) {
    allmapsModules[name] = {
      name,
      dependencies: []
    }
  }
}

for (const {
  name,
  dependencies,
  devDependencies
} of parsedPackageJsons.values()) {
  ;[...dependencies.keys(), ...devDependencies.keys()]
    .filter((dependency) => dependency.startsWith('@allmaps/'))
    .forEach((allmapsDependency) => {
      allmapsModules[name].dependencies.push(allmapsModules[allmapsDependency])
    })
}

describe(`Test dependency for cyclic dependencies`, () => {
  test('modules can be stringified (no cyclic dependencies)', () => {
    // JSON.stringify will throw on cyclic structures. The test fails if
    // stringify throws, which indicates a cyclic dependency in the
    // @allmaps/ module graph.
    expect(() => JSON.stringify(allmapsModules, null, 2)).not.toThrow()
  })
})
