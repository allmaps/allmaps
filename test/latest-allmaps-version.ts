import chalk from 'chalk'

import { getParsedPackageJsons } from './shared.ts'

// Checks if Allmaps modules use latest version of other
// Allmaps modules.

const parsedPackageJsons = await getParsedPackageJsons()

for (const {
  name,
  dependencies,
  devDependencies
} of parsedPackageJsons.values()) {
  ;[...dependencies.entries(), ...devDependencies.entries()]
    .filter(([dependency]) => dependency.startsWith('@allmaps/'))
    .forEach(([allmapsDependency, version]) => {
      const latestVersion = parsedPackageJsons.get(allmapsDependency)?.version
      if (`^${latestVersion}` !== version) {
        console.log(`${chalk.red(name)}:`)
        console.error(`  Should depend on ${chalk.green('^' + latestVersion)}`)
        console.error(`  Instead depends on ${chalk.yellow(version)}`)
      }
    })
}
