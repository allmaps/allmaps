import { execSync } from 'node:child_process'

import { baseDir, cliPath, readFile } from './fs.js'

function execInput(command: string, input?: string) {
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
    if (
      err &&
      typeof err === 'object' &&
      'stderr' in err &&
      typeof err.stderr === 'string'
    ) {
      const output = err.stderr
      throw new Error(output)
    } else {
      throw err
    }
  }
}

export function execString(command: string, input?: string) {
  return execInput(command, input).trim()
}

export function execFilename(command: string, inputFilename?: string) {
  let input
  if (inputFilename) {
    input = readFile(inputFilename)
  }

  return execInput(command, input)
}

export function execJson(command: string, inputFilename?: string) {
  return JSON.parse(execFilename(command, inputFilename))
}
