#version 300 es

precision highp float;

uniform mat4 u_projectedGeoToViewportTransform;
uniform mat4 u_viewportToClipTransform;

in vec2 a_projectedGeoPoint;
in vec2 a_projectedGeoOtherPoint;
in float a_isOtherPoint;
in float a_normalSign;

out float v_viewportLineLength;
out float v_viewportLineWidth;
out vec2 v_linePoint;

void main() {
  float viewportLineWidth = 8.0;

  vec2 viewportPoint = (u_projectedGeoToViewportTransform * vec4(a_projectedGeoPoint, 0.0f, 1.0f)).xy;
  vec2 viewportOtherPoint = (u_projectedGeoToViewportTransform * vec4(a_projectedGeoOtherPoint, 0.0f, 1.0f)).xy;

  vec2 viewportLine = vec2(viewportOtherPoint.x-viewportPoint.x, viewportOtherPoint.y-viewportPoint.y);
  vec2 viewportNormalizedLine = normalize(viewportLine);
  vec2 viewportNormalizedLineNormal = vec2(viewportNormalizedLine.y, -viewportNormalizedLine.x);
  v_viewportLineLength = length(viewportLine);

  float lineX = -1.0 * viewportLineWidth / 2.0 + a_isOtherPoint * (v_viewportLineLength + viewportLineWidth);
  float lineY = a_normalSign * viewportLineWidth / 2.0;
  v_linePoint = vec2(lineX, lineY);

  v_viewportLineWidth = viewportLineWidth;

  gl_Position = u_viewportToClipTransform * vec4(viewportPoint + lineX * viewportNormalizedLine + lineY * viewportNormalizedLineNormal, 0, 1);
}
