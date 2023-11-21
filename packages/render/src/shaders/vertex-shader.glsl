#version 300 es

precision highp float;

uniform mat4 u_render_transform;
uniform float u_animation_progress;

in vec2 a_webgl2_current_triangle_coordinates;
in vec2 a_webgl2_new_triangle_coordinates;
in vec2 a_resource_triangle_coordinates;
in float a_triangle_index;

out vec2 v_resource_triangle_coordinates;
out float v_triangle_index;

float cubic_in_out(float t) {
  return t < 0.5f ? 4.0f * t * t * t : 0.5f * pow(2.0f * t - 2.0f, 3.0f) + 1.0f;
}

// Sets gl_Position to vec4
// Coordinates go from -1 to 1.
void main() {
  v_resource_triangle_coordinates = a_resource_triangle_coordinates;
  v_triangle_index = a_triangle_index;

  vec2 a_webgl2_triangle_coordinates = mix(a_webgl2_current_triangle_coordinates, a_webgl2_new_triangle_coordinates, cubic_in_out(u_animation_progress));

  gl_Position = u_render_transform * vec4(a_webgl2_triangle_coordinates, 0.0f, 1.0f);
}
