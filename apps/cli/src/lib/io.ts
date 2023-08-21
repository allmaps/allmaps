import { createReadStream, readFileSync, ReadStream } from 'fs'
import { Readable } from 'stream'
import StreamValues from 'stream-json/streamers/StreamValues.js'

async function* concatStreams(readables: ReadStream[]) {
  for (const readable of readables) {
    for await (const chunk of readable) {
      yield chunk
    }
  }
}

export async function readInput(files: string[]): Promise<string[]> {
  if (process.stdin.isTTY) {
    return readFromFiles(files)
  } else {
    const input = await readFromStdin()
    return [input]
  }
}

export async function parseJsonInput(files?: string[]) {
  let jsonValues: unknown[] = []

  // TODO: does this function need the isTTY check?
  if (files && Array.isArray(files) && files.length) {
    jsonValues = await parseJsonFromFiles(files)
  } else if (!process.stdin.isTTY) {
    jsonValues = await parseJsonFromStdin()
  }

  if (jsonValues.length > 0) {
    return jsonValues
  } else {
    throw new Error(
      'No input files supplied, and nothing to read from the standard input'
    )
  }
}

export function parseJsonFromStream(stream: Readable) {
  return new Promise<unknown[]>((resolve, reject) => {
    const jsonValues: unknown[] = []

    stream.on('error', (err: Error) => reject(err))

    const pipeline = stream.pipe(StreamValues.withParser())
    pipeline.on('data', (data: { value: unknown }) =>
      jsonValues.push(data.value)
    )
    pipeline.on('end', () => resolve(jsonValues))
    pipeline.on('error', (err: Error) => reject(err))
  })
}

export function parseJsonFromFile(file: string): unknown {
  return JSON.parse(readFileSync(file, { encoding: 'utf8', flag: 'r' }))
}

export function readFromFiles(files: string[]) {
  if (!files || !files.length) {
    return []
  }

  return files.map((file) =>
    readFileSync(file, { encoding: 'utf8', flag: 'r' })
  )
}

export async function parseJsonFromFiles(files: string[]) {
  if (!files || !files.length) {
    return []
  }

  const iterable = await concatStreams(
    files.map((file) => createReadStream(file))
  )

  const mergedStream = Readable.from(iterable)
  return await parseJsonFromStream(mergedStream)
}

export function readFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let input = ''

    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (chunk) => {
      input += chunk
    })

    process.stdin.on('end', function () {
      try {
        resolve(input)
      } catch (err) {
        reject(err)
      }
    })
  })
}

export async function parseJsonFromStdin() {
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  return await parseJsonFromStream(process.stdin)
}

export function printJson(json: unknown) {
  console.log(JSON.stringify(json, null, 2))

  // if (process.stdout.isTTY) {
  //   // console.dir has 1 drawback: it doesn't add quotes to
  //   // object keys, the CLI output therefore can't be copy/pasted
  //   console.dir(json, { depth: null, colors: true })
  // } else {
  //   console.log(JSON.stringify(json, null, 2))
  // }
}

export function print(str: string) {
  console.log(str)
}
