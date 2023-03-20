import { readFile } from './fs.js'

export function helpMessage(command, message) {
  const help = readFile(`output/help/${command}.txt`)
  if (message) {
    return help + `\n${message}\n`
  }

  return help
}
