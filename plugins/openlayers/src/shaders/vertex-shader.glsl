#version 300 es

precision highp float;

// TODO: use uniform block?
// uniform FrameState {
// };

uniform float[6] u_coordinateToPixelTransform;
uniform vec2 u_viewportSize;

in vec4 a_position;

// TODO: use mat2x3 instead of float[6]
vec2 apply(float[6] transform, vec4 coordinate) {
  float x = coordinate[0];
  float y = coordinate[1];

  return vec2(transform[0] * x + transform[2] * y + transform[4], transform[1] * x + transform[3] * y + transform[5]);
}

void main() {
  vec2 pixel = apply(u_coordinateToPixelTransform, a_position);
  // vec2 position = pixel / u_viewportSize * vec2(1, -1) * 2.0 - 1.0;

  float x = pixel[0] / u_viewportSize.x * 2.0 - 1.0;
  float y = -(pixel[1] / u_viewportSize.y * 2.0 - 1.0);

  gl_Position = vec4(x, y, 0.0, 1.0);
}
