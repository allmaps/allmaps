import { setContext, getContext } from 'svelte'

const VARS_KEY = Symbol('vars')

export function setVarsState<T extends Record<string, unknown>>(vars: T) {
  return setContext(VARS_KEY, vars)
}

export function getVarsState<T extends Record<string, unknown>>() {
  const varsState = getContext<T>(VARS_KEY)

  if (!varsState) {
    throw new Error('VarsState is not set')
  }

  return varsState
}
