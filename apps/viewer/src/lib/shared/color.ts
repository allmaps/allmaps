import tinycolor from 'tinycolor2'

export function getHue(color: string) {
  return tinycolor(color).toHsl().h
}

export function fromHue(hue: number) {
  return '#' + tinycolor({ h: hue, s: 100, l: 50 }).toHex()
}
