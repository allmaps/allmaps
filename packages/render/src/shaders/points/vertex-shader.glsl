#version 300 es

precision highp float;

#include ../helpers.frag;

uniform mat4 u_renderHomogeneousTransform;
uniform float u_animationProgress;

in float a_viewportSize;
in vec4 a_color;
in float a_viewportBorderSize;
in vec4 a_borderColor;

in vec2 a_clipPoint;
in vec2 a_clipPreviousPoint;

out float v_viewportSize;
out vec4 v_color;
out float v_viewportBorderSize;
out vec4 v_borderColor;
out float v_viewportFeatherSize;
out float v_viewportTotalSize;

void main() {
  vec2 clipPoint = mix(a_clipPreviousPoint, a_clipPoint, easing(u_animationProgress));

  gl_Position = u_renderHomogeneousTransform * vec4(clipPoint, 0.0f, 1.0f);

  v_viewportFeatherSize = 1.0;

  v_viewportTotalSize = a_viewportSize + a_viewportBorderSize + v_viewportFeatherSize;
  gl_PointSize = v_viewportTotalSize;
  // gl_PointSize is the diameter of the point.
  // The border is centered on the edge of a point with diameter = size
  // so adding half a border left and half a border right
  // results in adding a full border to the total size.
  // Also adding half an outside feather left and half an outside feather right,
  // which also serves as minimal size.
  // Note: there seems to be a maximum size of 512? Could be due to graphics card (or Float32Array)?

  v_viewportSize = a_viewportSize;
  v_color = a_color;
  v_viewportBorderSize = a_viewportBorderSize;
  v_borderColor = a_borderColor;
}
