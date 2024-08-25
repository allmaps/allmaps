#version 300 es

precision highp float;

#include ../helpers.glsl;

uniform mat4 u_projectedGeoToViewportTransform;
uniform mat4 u_viewportToClipTransform;
uniform float u_animationProgress;

in vec2 a_projectedGeoPoint;
in vec2 a_projectedGeoOtherPoint;
in vec2 a_projectedGeoPreviousPoint;
in vec2 a_projectedGeoPreviousOtherPoint;
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
  vec2 projectedGeoPoint = mix(a_projectedGeoPreviousPoint, a_projectedGeoPoint, easing(u_animationProgress));
  vec2 projectedGeoOtherPoint = mix(a_projectedGeoPreviousOtherPoint, a_projectedGeoOtherPoint, easing(u_animationProgress));

  vec2 viewportPoint = (u_projectedGeoToViewportTransform * vec4(projectedGeoPoint, 0.0f, 1.0f)).xy;
  vec2 viewportOtherPoint = (u_projectedGeoToViewportTransform * vec4(projectedGeoOtherPoint, 0.0f, 1.0f)).xy;

  vec2 viewportLine = vec2(viewportOtherPoint.x-viewportPoint.x, viewportOtherPoint.y-viewportPoint.y);
  vec2 viewportNormalizedLine = normalize(viewportLine);
  vec2 viewportNormalizedLineNormal = vec2(viewportNormalizedLine.y, -viewportNormalizedLine.x);
  v_viewportLineLength = length(viewportLine);

  v_viewportFeatherSize = 1.0;

  // TODO: figure out why size lines need to be devided by two
  // to have the same effect as point sizes
  // this could be related to dpr (but then one would expert multiplication by two?)
  float viewportSize = a_viewportSize / 2.0;
  float viewportBorderSize = a_viewportBorderSize / 2.0;
  v_viewportFeatherSize = v_viewportFeatherSize / 2.0;

  v_viewportTotalSize = viewportSize + viewportBorderSize + v_viewportFeatherSize;
  float lineX = -1.0 * v_viewportTotalSize / 2.0 + a_isOtherPoint * (v_viewportLineLength + 2.0 * (v_viewportTotalSize / 2.0));
  float lineY = a_normalSign * v_viewportTotalSize / 2.0;
  v_linePoint = vec2(lineX, lineY);
  // The border is centered on the edge of a line with diameter = size
  // so adding half a border left and half a border right
  // results in adding a full border to the total size.
  // Also adding half an outside feather left and half an outside feather right,
  // which also serves as minimal size.
  // Note: there seems to be a maximum size of 512? Could be due to graphics card (or Float32Array)?

  v_viewportSize = viewportSize;
  v_color = a_color;
  v_viewportBorderSize = viewportBorderSize;
  v_borderColor = a_borderColor;

  gl_Position = u_viewportToClipTransform * vec4(viewportPoint + lineX * viewportNormalizedLine + lineY * viewportNormalizedLineNormal, 0, 1);
}
