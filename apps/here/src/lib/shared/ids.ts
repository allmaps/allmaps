export function getAllmapsId(url: string) {
  const match = url.match(/\/(maps\/[0-9a-f]{16}(?:@[0-9a-f]{16})?)/)
  return match ? match[1] : undefined
}
