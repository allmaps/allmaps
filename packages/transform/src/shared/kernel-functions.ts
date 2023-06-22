export function linearKernel(r: number) {
  return r
}

export function cubicKernel(r: number) {
  return Math.pow(r, 3)
}

export function quinticKernel(r: number) {
  return Math.pow(r, 5)
}

export function thinPlateKernel(r: number) {
  if (r === 0) {
    return 0
  }
  return Math.pow(r, 2) * Math.log(r)
}

export function gaussianKernel(r: number, epsilon: number) {
  return Math.exp(-Math.pow(r / epsilon, 2))
}

export function inverseMultiquadricKernel(r: number, epsilon: number) {
  return 1.0 / Math.sqrt(Math.pow(r / epsilon, 2) + 1)
}

export function multiquadricKernel(r: number, epsilon: number) {
  return Math.sqrt(Math.pow(r / epsilon, 2) + 1)
}
