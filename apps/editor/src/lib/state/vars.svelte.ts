import { setContext, getContext } from 'svelte'

const VARS_KEY = Symbol('vars')

export class VarsState<T extends Record<string, unknown>> {
  #vars: T

  constructor(vars: T) {
    this.#vars = vars
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.#vars[key]
  }
}

export function setVarsState<T extends Record<string, unknown>>(vars: T) {
  return setContext(VARS_KEY, new VarsState(vars))
}

export function getVarsState<T extends Record<string, unknown>>() {
  const varsState = getContext<VarsState<T>>(VARS_KEY)

  if (!varsState) {
    throw new Error('VarsState is not set')
  }

  return varsState
}
