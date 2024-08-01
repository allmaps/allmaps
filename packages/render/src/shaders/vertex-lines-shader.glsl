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

  float otherPointFlip = -2.0 * a_isOtherPoint + 1.0; // -1 for other point, 1 for point
  vec2 viewportLine = otherPointFlip * vec2(viewportOtherPoint.x-viewportPoint.x, viewportOtherPoint.y-viewportPoint.y);
  vec2 viewportNormalizedLine = normalize(viewportLine);
  vec2 viewportNormalizedLineNormal = otherPointFlip * normalize(vec2(viewportLine.y, -viewportLine.x));
  vec2 viewportDeltaX = viewportNormalizedLine * (-1.0 * viewportLineWidth / 2.0 + a_isOtherPoint * viewportLineWidth);
  vec2 viewportDeltaY = a_normalSign * viewportNormalizedLineNormal * viewportLineWidth / 2.0;

  v_viewportLineLength = length(viewportLine);
  v_viewportLineWidth = viewportLineWidth;
  v_linePoint = vec2(-1.0 * viewportLineWidth / 2.0 + a_isOtherPoint * (v_viewportLineLength + viewportLineWidth), a_normalSign * otherPointFlip * viewportLineWidth / 2.0);

  gl_Position = u_viewportToClipTransform * vec4(viewportPoint + viewportDeltaX + viewportDeltaY, 0, 1);
}
