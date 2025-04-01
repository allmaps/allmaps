import tinycolor from 'tinycolor2'

import type { Color } from '../shared/types.js'

export function Pin(
  color: Color,
  width: number,
  height: number,
  style: React.CSSProperties
) {
  const colorString = tinycolor(color).toString()
  const lightColorString = tinycolor(color).lighten(20).toString()

  return (
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 182.4 315"
      style={style}
    >
      <g>
        <circle fill={lightColorString} cx="91.2" cy="91.2" r="81.2" />
        <path
          fill={colorString}
          d="M182.4,91.2C182.4,40.9,141.5,0,91.2,0S0,40.9,0,91.2s35.3,85.4,80.7,90.6v122.7h21V181.8
		C147.1,176.6,182.4,137.9,182.4,91.2L182.4,91.2L182.4,91.2z M91.2,162.4c-39.3,0-71.2-31.9-71.2-71.2S51.9,20,91.2,20
		s71.2,31.9,71.2,71.2S130.5,162.4,91.2,162.4L91.2,162.4L91.2,162.4z"
        />
      </g>
      <path
        fill={colorString}
        d="M91.2,138.7c-17.8,0-34.5-9.4-43.5-24.6l-1.6-2.7l15.5-8.9l1.5,2.6c5.7,9.8,16.4,15.8,28,15.8l0,0
	c11.5,0,22.2-6.1,28-15.8l1.5-2.6l15.5,8.9l-1.6,2.7c-9,15.2-25.7,24.6-43.5,24.6H91.2L91.2,138.7L91.2,138.7z M117.8,86.7
	c-6.6,0-12-5.3-12-11.8s5.4-11.8,12-11.8c6.6,0,12,5.3,12,11.8S124.4,86.7,117.8,86.7z M64.6,86.7c-6.6,0-12-5.3-12-11.8
	s5.4-11.8,12-11.8s12,5.3,12,11.8S71.2,86.7,64.6,86.7z"
      />
      <path
        fill={colorString}
        d="M80.7,304.5c0,5.8,4.7,10.5,10.5,10.5s10.5-4.7,10.5-10.5"
      />
    </svg>
  )
}
