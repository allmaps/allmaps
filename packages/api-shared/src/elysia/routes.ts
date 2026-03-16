import { t } from 'elysia'

export class RegExpRoute<T> {
  #param: string
  #regexp: RegExp

  constructor(param: string, regexp: RegExp) {
    this.#param = param
    this.#regexp = regexp
  }

  get path() {
    return `:${this.#param}`
  }

  get params() {
    return t.Object({
      [this.#param]: t.String({
        pattern: this.#regexp.toString().slice(1, -1)
      })
    })
  }

  parse(params: Record<string, unknown>): T {
    const value = params[this.#param]

    if (typeof value !== 'string') {
      throw new Error(`Expected ${this.#param} to be a string`)
    }

    if (!value) {
      throw new Error(`Expected ${this.#param} to be a non-empty string`)
    }

    const match = this.#regexp.exec(value)

    if (match) {
      return match.groups as T
    }

    throw new Error(`Expected ${this.#param} to match ${this.#regexp}`)
  }
}
