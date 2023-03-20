import { execSync } from 'child_process'

import { baseDir, cliPath, readFile } from './fs.js'

export function exec(command, inputFilename) {
  let cliCommand = cliPath

  if (command) {
    cliCommand = `${cliCommand} ${command}`
  }

  let input
  if (inputFilename) {
    input = readFile(inputFilename)
  }

  try {
    const output = execSync(cliCommand, {
      input,
      cwd: baseDir,
      encoding: 'utf8',
      stdio: 'pipe'
    }).toString()

    return output
  } catch (err) {
    const output = err.stderr
    throw new Error(output)
  }
}

export function execJson(command, inputFilename) {
  return JSON.parse(exec(command, inputFilename))
}
