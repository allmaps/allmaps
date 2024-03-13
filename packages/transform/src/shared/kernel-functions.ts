import { KernelFunctionOptions } from './types'

export function linearKernel(
  r: number,
  options: KernelFunctionOptions
): number {
  if (!options.der) {
    return r
  } else if (options.der == 1) {
    return 1
  } else {
    throw new Error('Derivate of order ' + options.der + ' not implemented')
  }
}

export function cubicKernel(r: number, options: KernelFunctionOptions) {
  if (!options.der) {
    return Math.pow(r, 3)
  } else if (options.der == 1) {
    return 3 * Math.pow(r, 2)
  } else {
    throw new Error('Derivate of order ' + options.der + ' not implemented')
  }
}

export function quinticKernel(r: number, options: KernelFunctionOptions) {
  if (!options.der) {
    return Math.pow(r, 5)
  } else if (options.der == 1) {
    return 5 * Math.pow(r, 4)
  } else {
    throw new Error('Derivate of order ' + options.der + ' not implemented')
  }
}

export function thinPlateKernel(r: number, options: KernelFunctionOptions) {
  if (!options.der) {
    if (r === 0) {
      return 0
    }
    return Math.pow(r, 2) * Math.log(r)
  } else if (options.der == 1) {
    if (r === 0) {
      return 0
    }
    return r + 2 * r * Math.log(r)
  } else {
    throw new Error('Derivate of order ' + options.der + ' not implemented')
  }
}

export function gaussianKernel(r: number, options: KernelFunctionOptions) {
  options.epsilon = options.epsilon || 1
  if (!options.der) {
    return Math.exp(-Math.pow(r / options.epsilon, 2))
  } else if (options.der == 1) {
    return (
      ((-2 * r) / options.epsilon ** 2) *
      Math.exp(-Math.pow(r / options.epsilon, 2))
    )
  } else {
    throw new Error('Derivate of order ' + options.der + ' not implemented')
  }
}

export function inverseMultiquadricKernel(
  r: number,
  options: KernelFunctionOptions
) {
  options.epsilon = options.epsilon || 1
  if (!options.der) {
    return 1.0 / Math.sqrt(Math.pow(r / options.epsilon, 2) + 1)
  } else if (options.der == 1) {
    return (
      -r /
      (options.epsilon ** 2 *
        Math.pow(Math.pow(r / options.epsilon, 2) + 1, 3 / 2))
    )
  } else {
    throw new Error('Derivate of order ' + options.der + ' not implemented')
  }
}

export function multiquadricKernel(r: number, options: KernelFunctionOptions) {
  options.epsilon = options.epsilon || 1
  if (!options.der) {
    return Math.sqrt(Math.pow(r / options.epsilon, 2) + 1)
  } else if (options.der == 1) {
    return (
      r /
      (options.epsilon ** 2 * Math.sqrt(Math.pow(r / options.epsilon, 2) + 1))
    )
  } else {
    throw new Error('Derivate of order ' + options.der + ' not implemented')
  }
}
