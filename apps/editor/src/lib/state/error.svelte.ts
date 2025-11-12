import { setContext, getContext } from 'svelte'

const ERROR_KEY = Symbol('error')

export class ErrorState {
  #error = $state<Error>()

  set error(error: unknown) {
    if (error) {
      console.error('Error:', error)
      if (error instanceof Error) {
        this.#error = error
      } else {
        this.#error = new Error('Unknown error')
      }
    } else {
      this.#error = undefined
    }
  }

  get error() {
    return this.#error
  }
}

export function setErrorState() {
  return setContext(ERROR_KEY, new ErrorState())
}

export function getErrorState() {
  const errorState = getContext<ReturnType<typeof setErrorState>>(ERROR_KEY)

  if (!errorState) {
    throw new Error('ErrorState is not set')
  }

  return errorState
}
