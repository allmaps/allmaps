#version 300 es

precision highp float;
precision highp isampler2D;

uniform float u_size;
uniform vec4 u_color;
uniform float u_borderSize;
uniform vec4 u_borderColor;

out vec4 color;

void main() {
  // Discard pixels outside of clip space around point (from -1 to 1)
  float distance = length(2.0 * gl_PointCoord - 1.0);
  if (distance > 1.0) {
    discard;
  }

  // Apply color
  color = u_color;

  // Apply border
  float borderSmoothStep = smoothstep(
      u_size - u_borderSize - 2.0,
      u_size - u_borderSize,
      distance * (u_size + u_borderSize)
  );
  color = (u_borderColor * borderSmoothStep) + ((1.0 - borderSmoothStep) * color);
}
