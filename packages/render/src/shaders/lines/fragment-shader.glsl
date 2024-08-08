#version 300 es

precision highp float;
precision highp isampler2D;

in float v_viewportLineLength;
in vec2 v_linePoint;
in float v_viewportSize;
in vec4 v_color;
in float v_viewportBorderSize;
in vec4 v_borderColor;

out vec4 color;

void main() {
  float distance;
  if (v_linePoint.x < 0.0) {
    distance = 2.0 * length(v_linePoint - vec2(0.0,0.0)) / v_viewportSize;
  } else if (v_linePoint.x > v_viewportLineLength) {
    distance = 2.0 * length(v_linePoint - vec2(v_viewportLineLength,0.0)) / v_viewportSize;
  } else {
    distance = 2.0 * abs(v_linePoint.y) / v_viewportSize;
  }
  if (distance > 1.0) {
    discard;
  }

  // Apply color
  color = v_color;
  float size = v_viewportSize;

  // Apply border
  float borderSmoothStep = smoothstep(
      v_viewportSize - v_viewportBorderSize - 2.0,
      v_viewportSize - v_viewportBorderSize,
      distance * (v_viewportSize + v_viewportBorderSize)
  );
  color = (v_borderColor * borderSmoothStep) + ((1.0 - borderSmoothStep) * color);
}
