#version 300 es

precision highp float;
precision highp isampler2D;

in float v_viewportLineLength;
in float v_viewportLineWidth;
in vec2 v_linePoint;

out vec4 color;

void main() {
  float distance = 2.0 * abs(v_linePoint.y) / v_viewportLineWidth;
  if (v_linePoint.x < 0.0) {
    distance = 2.0 * length(v_linePoint - vec2(0.0,0.0)) / v_viewportLineWidth;
  } else if (v_linePoint.x > v_viewportLineLength) {
    distance = 2.0 * length(v_linePoint - vec2(v_viewportLineLength,0.0)) / v_viewportLineWidth;
  }
  if (distance > 1.0) {
    discard;
  }

  // Apply color
  color = vec4(0, 0, 0, 1);
  vec4 borderColor = vec4(1, 1, 1, 1);

  float size = v_viewportLineWidth;
  float borderSize = 1.0;

  // Apply border
  float borderSmoothStep = smoothstep(
      size - borderSize - 2.0,
      size - borderSize,
      distance * (size + borderSize)
  );
  color = (borderColor * borderSmoothStep) + ((1.0 - borderSmoothStep) * color);
}
