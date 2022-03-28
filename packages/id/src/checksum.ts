export default function serialize(obj: {}): string {
  if (Array.isArray(obj)) {
    return `[${obj.map((i) => serialize(i)).join(',')}]`
  } else if (typeof obj === 'number') {
    return `${obj}`
  } else if (typeof obj === 'string') {
    return `"${obj}"`
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj)
      .sort()
      .map((key: string) => `${key}:${serialize(obj[key as keyof typeof obj])}`)
      .join('|')
  }

  return String(obj)
}
