import { getParsedPackageJsons } from './shared.ts'

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

try {
  JSON.stringify(allmapsModules, null, 2)
} catch (err) {
  throw new Error('Allmaps modules contain cyclic dependency!')
}
