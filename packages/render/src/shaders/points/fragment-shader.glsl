#version 300 es

precision highp float;
precision highp isampler2D;

uniform float u_size;
uniform vec4 u_color;
uniform float u_borderSize;
uniform vec4 u_borderColor;

// in float v_size;
// in vec4 v_color;
// in float v_borderSize;
// in vec4 v_borderColor;

out vec4 color;

void main() {
  float x_size = u_size;
  vec4 x_color = u_color;
  float x_borderSize = u_borderSize;
  vec4 x_borderColor = u_borderColor;

  // x_size = 16.0;
  // x_color = vec4(1, 0, 0, 1);
  // x_borderSize = 2.0;
  // x_borderColor = vec4(1, 1, 1, 1);

  // Discard pixels outside of clip space around point (from -1 to 1)
  float distance = length(2.0 * gl_PointCoord - 1.0);
  if (distance > 1.0) {
    discard;
  }

  // Apply color
  color = x_color;

  // Apply border
  float borderSmoothStep = smoothstep(
      x_size - x_borderSize - 2.0,
      x_size - x_borderSize,
      distance * (x_size + x_borderSize)
  );
  color = (x_borderColor * borderSmoothStep) + ((1.0 - borderSmoothStep) * color);
}
