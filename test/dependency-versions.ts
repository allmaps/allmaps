import chalk from 'chalk'

import {
  getParsedPackageJsons,
  collectDependencyVersions,
  addPackageName
} from './shared.ts'

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

for (const [dependency, versions] of allDependencies.entries()) {
  if (versions.size > 1) {
    console.error(`${chalk.green.bold(dependency)}:`)

    for (const [version, packageNames] of versions) {
      console.error(
        `  - ${chalk.yellow(version)}: ${[...packageNames].join(', ')}`
      )
    }
  }
}
