import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import type { Readable } from 'node:stream'

export async function prompt(
  question: string,
  hidden = false,
  input: Readable & { isTTY?: boolean } = process.stdin,
  output: Writable & { isTTY?: boolean } = process.stderr
) {
  if (!input.isTTY || !output.isTTY)
    throw new Error(
      'Run setup:env in an interactive terminal to answer prompts'
    )
  const terminal = new Writable({
    write(chunk, encoding, callback) {
      if (!hidden) output.write(chunk, encoding)
      callback()
    }
  })
  const readline = createInterface({ input, output: terminal, terminal: true })
  const controller = new AbortController()
  const cancel = () => controller.abort()
  readline.on('SIGINT', cancel)
  readline.on('close', cancel)
  output.write(`${question}${hidden ? ' (hidden)' : ''}: `)
  try {
    return await readline.question('', { signal: controller.signal })
  } catch {
    throw new Error('Setup cancelled; no environment files were changed')
  } finally {
    readline.close()
    terminal.destroy()
    if (hidden) output.write('\n')
  }
}
