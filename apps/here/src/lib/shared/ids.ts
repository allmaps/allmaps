export function getAllmapsId(url: string) {
  // /(/<allmapsId>maps/\w{16})$/;

  // TODO: use regex
  const allmapsId = url.replace('https://annotations.allmaps.org/', '')
  return allmapsId
}
