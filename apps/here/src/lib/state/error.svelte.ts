import { setContext, getContext } from 'svelte'

const ERROR_KEY = Symbol('error')

export class ErrorState {
  #error = $state<Error>()
  #transformerError = $state<Error>()
  #geolocationPositionError = $state<GeolocationPositionError>()

  set error(error: unknown) {
    if (error) {
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

  set transformerError(error: unknown) {
    if (error) {
      if (error instanceof Error) {
        this.#transformerError = error
      } else {
        this.#transformerError = new Error('Unknown error')
      }
    } else {
      this.#transformerError = undefined
    }
  }

  get transformerError() {
    return this.#transformerError
  }

  set geolocationPositionError(error: GeolocationPositionError | undefined) {
    this.#geolocationPositionError = error
  }

  get geolocationPositionError() {
    return this.#geolocationPositionError
  }

  get userHasDeniedGeolocation() {
    return this.#geolocationPositionError &&
      this.#geolocationPositionError.code === 1
      ? true
      : false
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
