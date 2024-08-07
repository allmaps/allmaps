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
in float a_size;
in vec3 a_color;
in float a_borderSize;
in vec3 a_borderColor;

out float v_viewportLineLength;
out float v_viewportLineWidth;
out vec2 v_linePoint;
out float v_size;
out vec3 v_color;
out float v_borderSize;
out vec3 v_borderColor;

void main() {
  float viewportLineWidth = 8.0;

  vec2 projectedGeoPoint = mix(a_projectedGeoPreviousPoint, a_projectedGeoPoint, easing(u_animationProgress));
  vec2 projectedGeoOtherPoint = mix(a_projectedGeoPreviousOtherPoint, a_projectedGeoOtherPoint, easing(u_animationProgress));

  vec2 viewportPoint = (u_projectedGeoToViewportTransform * vec4(projectedGeoPoint, 0.0f, 1.0f)).xy;
  vec2 viewportOtherPoint = (u_projectedGeoToViewportTransform * vec4(projectedGeoOtherPoint, 0.0f, 1.0f)).xy;

  vec2 viewportLine = vec2(viewportOtherPoint.x-viewportPoint.x, viewportOtherPoint.y-viewportPoint.y);
  vec2 viewportNormalizedLine = normalize(viewportLine);
  vec2 viewportNormalizedLineNormal = vec2(viewportNormalizedLine.y, -viewportNormalizedLine.x);
  v_viewportLineLength = length(viewportLine);

  float lineX = -1.0 * viewportLineWidth / 2.0 + a_isOtherPoint * (v_viewportLineLength + viewportLineWidth);
  float lineY = a_normalSign * viewportLineWidth / 2.0;
  v_linePoint = vec2(lineX, lineY);

  v_viewportLineWidth = viewportLineWidth;

  v_size = a_size;
  v_color = a_color;
  v_borderSize = a_borderSize;
  v_borderColor = a_borderColor;

  gl_Position = u_viewportToClipTransform * vec4(viewportPoint + lineX * viewportNormalizedLine + lineY * viewportNormalizedLineNormal, 0, 1);
}
