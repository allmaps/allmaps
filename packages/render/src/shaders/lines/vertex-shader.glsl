#version 300 es

precision highp float;

#include ../helpers.frag;

uniform mat4 u_renderHomogeneousTransform;
uniform mat4 u_viewportToClipHomogeneousTransform;
uniform mat4 u_clipToViewportHomogeneousTransform;
uniform float u_animationProgress;

in vec2 a_clipPoint;
in vec2 a_clipOtherPoint;
in vec2 a_clipPreviousPoint;
in vec2 a_clipPreviousOtherPoint;
in float a_isOtherPoint;
in float a_normalSign;
in float a_viewportSize;
in vec4 a_color;
in float a_viewportBorderSize;
in vec4 a_borderColor;

out float v_viewportLineLength;
out vec2 v_linePoint;
out float v_viewportSize;
out vec4 v_color;
out float v_viewportBorderSize;
out vec4 v_borderColor;
out float v_viewportFeatherSize;
out float v_viewportTotalSize;

void main() {
  vec2 clipPoint = mix(a_clipPreviousPoint, a_clipPoint, easing(u_animationProgress));
  vec2 clipOtherPoint = mix(a_clipPreviousOtherPoint, a_clipOtherPoint, easing(u_animationProgress));

  vec2 viewportPoint = (u_clipToViewportHomogeneousTransform * u_renderHomogeneousTransform * vec4(clipPoint, 0.0f, 1.0f)).xy;
  vec2 viewportOtherPoint = (u_clipToViewportHomogeneousTransform * u_renderHomogeneousTransform * vec4(clipOtherPoint, 0.0f, 1.0f)).xy;

  vec2 viewportLine = vec2(viewportOtherPoint.x-viewportPoint.x, viewportOtherPoint.y-viewportPoint.y);
  vec2 viewportNormalizedLine = normalize(viewportLine);
  vec2 viewportNormalizedLineNormal = vec2(viewportNormalizedLine.y, -viewportNormalizedLine.x);
  v_viewportLineLength = length(viewportLine);

  v_viewportFeatherSize = 1.0;

  v_viewportTotalSize = a_viewportSize + a_viewportBorderSize + v_viewportFeatherSize;
  float lineX = -1.0 * v_viewportTotalSize / 2.0 + a_isOtherPoint * (v_viewportLineLength + 2.0 * (v_viewportTotalSize / 2.0));
  float lineY = a_normalSign * v_viewportTotalSize / 2.0;
  v_linePoint = vec2(lineX, lineY);
  // The border is centered on the edge of a line with diameter = size
  // so adding half a border left and half a border right
  // results in adding a full border to the total size.
  // Also adding half an outside feather left and half an outside feather right,
  // which also serves as minimal size.
  // Note: there seems to be a maximum size of 512? Could be due to graphics card (or Float32Array)?

  v_viewportSize = a_viewportSize;
  v_color = a_color;
  v_viewportBorderSize = a_viewportBorderSize;
  v_borderColor = a_borderColor;

  gl_Position =  u_viewportToClipHomogeneousTransform * vec4(viewportPoint + lineX * viewportNormalizedLine + lineY * viewportNormalizedLineNormal, 0, 1);
}
