import { join } from 'node:path'
import { glob, readFile } from 'node:fs/promises'

const dirname = import.meta.dirname

export type VersionFromPackage = {
  version: string
  packageName: string
}

export type Dependencies = Map<string, string>

export type DependenciesFromPackage = Map<string, VersionFromPackage>

export type ParsedPackageJson = {
  name: string
  version: string
  dependencies: Dependencies
  devDependencies: Dependencies
}

const apps = glob(join(dirname, '../apps/**/package.json'))
const packages = glob(join(dirname, '../packages/**/package.json'))

async function* combine<T>(...iterables: AsyncIterable<T>[]) {
  for (const iterable of iterables) {
    yield* iterable
  }
}

export async function getParsedPackageJsons() {
  const parsedPackageJsons: Map<string, ParsedPackageJson> = new Map()

  for await (const entry of combine(apps, packages)) {
    const packageJson = await readPackageJson(entry)
    const parsedPackageJson = parsePackageJson(packageJson)
    parsedPackageJsons.set(parsedPackageJson.name, parsedPackageJson)
  }

  return parsedPackageJsons
}

export function parseDenpendencies(dependencies: unknown): Dependencies {
  if (dependencies && typeof dependencies === 'object') {
    const parsedDependencies: Dependencies = new Map()

    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version === 'string') {
        parsedDependencies.set(name, version)
      }
    }

    return parsedDependencies
  }

  throw new Error('Invalid dependencies')
}

export function collectDependencyVersions(
  dependenciesArray: DependenciesFromPackage[]
) {
  const allDependencies: Map<string, Map<string, Set<string>>> = new Map()

  for (const dependencies of dependenciesArray) {
    for (const [
      dependency,
      { version, packageName }
    ] of dependencies.entries()) {
      if (allDependencies.has(dependency)) {
        if (allDependencies.get(dependency)?.has(version)) {
          allDependencies.get(dependency)?.get(version)?.add(packageName)
        } else {
          allDependencies.get(dependency)?.set(version, new Set([packageName]))
        }
      } else {
        allDependencies.set(
          dependency,
          new Map([[version, new Set([packageName])]])
        )
      }
    }
  }

  return allDependencies
}

export function parsePackageJson(packageJson: unknown): ParsedPackageJson {
  if (packageJson && typeof packageJson === 'object') {
    if (
      'name' in packageJson &&
      typeof packageJson.name === 'string' &&
      'version' in packageJson &&
      typeof packageJson.version === 'string'
    ) {
      const name = packageJson.name
      const version = packageJson.version

      return {
        name,
        version,
        dependencies:
          'dependencies' in packageJson
            ? parseDenpendencies(packageJson.dependencies)
            : new Map(),
        devDependencies:
          'devDependencies' in packageJson
            ? parseDenpendencies(packageJson.devDependencies)
            : new Map()
      }
    }
  }

  throw new Error('Invalid package.json')
}

export async function readPackageJson(path: string) {
  const packageJson = await readFile(path, 'utf-8')
  return JSON.parse(packageJson)
}

export function addPackageName(
  dependencies: Dependencies,
  packageName: string
): DependenciesFromPackage {
  const dependenciesFromPackage: DependenciesFromPackage = new Map()
  for (const [name, version] of dependencies) {
    dependenciesFromPackage.set(name, { version, packageName })
  }
  return dependenciesFromPackage
}
