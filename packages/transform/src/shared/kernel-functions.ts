import type { KernelFunctionOptions } from './types.js'

/**
 * Linear kernel
 *
 * @param r - Radius
 * @param options - Kernel Function Options
 * @returns Evaluated kernel
 */
export function linearKernel(
  r: number,
  options: KernelFunctionOptions
): number {
  if (!options.derivative) {
    return r
  } else if (options.derivative === 1) {
    return 1
  } else {
    throw new Error(
      'Derivate of order ' + options.derivative + ' not implemented'
    )
  }
}

/**
 * Cubic kernel
 *
 * @param r - Radius
 * @param options - Kernel Function Options
 * @returns Evaluated kernel
 */
export function cubicKernel(r: number, options: KernelFunctionOptions) {
  if (!options.derivative) {
    return Math.pow(r, 3)
  } else if (options.derivative === 1) {
    return 3 * Math.pow(r, 2)
  } else {
    throw new Error(
      'Derivate of order ' + options.derivative + ' not implemented'
    )
  }
}

/**
 * Quintic kernel
 *
 * @param r - Radius
 * @param options - Kernel Function Options
 * @returns Evaluated kernel
 */
export function quinticKernel(r: number, options: KernelFunctionOptions) {
  if (!options.derivative) {
    return Math.pow(r, 5)
  } else if (options.derivative === 1) {
    return 5 * Math.pow(r, 4)
  } else {
    throw new Error(
      'Derivate of order ' + options.derivative + ' not implemented'
    )
  }
}

/**
 * Thin Plate Spline
 *
 * @param r - Radius
 * @param options - Kernel Function Options
 * @returns Evaluated kernel
 */
export function thinPlateKernel(r: number, options: KernelFunctionOptions) {
  if (!options.derivative) {
    if (r === 0) {
      return 0
    }
    return Math.pow(r, 2) * Math.log(r)
  } else if (options.derivative === 1) {
    if (r === 0) {
      return 0
    }
    return r + 2 * r * Math.log(r)
  } else {
    throw new Error(
      'Derivate of order ' + options.derivative + ' not implemented'
    )
  }
}

/**
 * Guassian kernel
 *
 * @param r - Radius
 * @param options - Kernel Function Options
 * @returns Evaluated kernel
 */
export function gaussianKernel(r: number, options: KernelFunctionOptions) {
  options.epsilon = options.epsilon || 1
  if (!options.derivative) {
    return Math.exp(-Math.pow(r / options.epsilon, 2))
  } else if (options.derivative === 1) {
    return (
      ((-2 * r) / options.epsilon ** 2) *
      Math.exp(-Math.pow(r / options.epsilon, 2))
    )
  } else {
    throw new Error(
      'Derivate of order ' + options.derivative + ' not implemented'
    )
  }
}

/**
 * Inverse Multiquadratic kernel
 *
 * @param r - Radius
 * @param options - Kernel Function Options
 * @returns Evaluated kernel
 */
export function inverseMultiquadricKernel(
  r: number,
  options: KernelFunctionOptions
) {
  options.epsilon = options.epsilon || 1
  if (!options.derivative) {
    return 1.0 / Math.sqrt(Math.pow(r / options.epsilon, 2) + 1)
  } else if (options.derivative === 1) {
    return (
      -r /
      (options.epsilon ** 2 *
        Math.pow(Math.pow(r / options.epsilon, 2) + 1, 3 / 2))
    )
  } else {
    throw new Error(
      'Derivate of order ' + options.derivative + ' not implemented'
    )
  }
}

/**
 * Multiquadratic kernel
 *
 * @param r - Radius
 * @param options - Kernel Function Options
 * @returns Evaluated kernel
 */
export function multiquadricKernel(r: number, options: KernelFunctionOptions) {
  options.epsilon = options.epsilon || 1
  if (!options.derivative) {
    return Math.sqrt(Math.pow(r / options.epsilon, 2) + 1)
  } else if (options.derivative === 1) {
    return (
      r /
      (options.epsilon ** 2 * Math.sqrt(Math.pow(r / options.epsilon, 2) + 1))
    )
  } else {
    throw new Error(
      'Derivate of order ' + options.derivative + ' not implemented'
    )
  }
}
