#version 300 es

precision highp float;

out vec2 v_pixel_position;
out float v_pixel_triangle_index; // DEV

uniform mat4 u_projectionMatrix;

uniform float u_animation_progress;

in vec2 a_position_current;
in vec2 a_position_new;

in vec2 a_pixel_position;
in float a_pixel_triangle_index; // DEV

float cubicInOut(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}

// Sets gl_Position to vec4
// Coordinates go from -1 to 1.
void main() {
  v_pixel_position = a_pixel_position;
  v_pixel_triangle_index = a_pixel_triangle_index;  // DEV

  vec2 a_position = mix(a_position_current, a_position_new, cubicInOut(u_animation_progress));

  gl_Position = u_projectionMatrix * vec4(a_position, 0.0, 1.0);
}
