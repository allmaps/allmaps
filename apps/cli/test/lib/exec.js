import { execSync } from 'child_process'

import { baseDir, cliPath, readFile } from './fs.js'

function execInput(command, input = null) {
  let cliCommand = cliPath

  if (command) {
    cliCommand = `${cliCommand} ${command}`
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

export function execString(command, input = null) {
  return execInput(command, input).trim()
}

export function execFilename(command, inputFilename = null) {
  let input
  if (inputFilename) {
    input = readFile(inputFilename)
  }

  return execInput(command, input)
}

export const exec = execFilename

export function execJson(command, inputFilename = null) {
  return JSON.parse(execFilename(command, inputFilename))
}
