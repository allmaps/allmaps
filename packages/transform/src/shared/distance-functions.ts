export function distanceLinear(r: number) {
  return r
}

export function distanceCubic(r: number) {
  return Math.pow(r, 3)
}

export function distanceQuintic(r: number) {
  return Math.pow(r, 5)
}

export function distanceThinPlate(r: number) {
  if (r === 0) return 0
  return Math.pow(r, 2) * Math.log(r)
}

export function distanceGaussian(r: number, epsilon: number) {
  return Math.exp(-Math.pow(r / epsilon, 2))
}

export function distanceInverseMultiquadric(r: number, epsilon: number) {
  return 1.0 / Math.sqrt(Math.pow(r / epsilon, 2) + 1)
}

export function distanceMultiquadric(r: number, epsilon: number) {
  return Math.sqrt(Math.pow(r / epsilon, 2) + 1)
}
