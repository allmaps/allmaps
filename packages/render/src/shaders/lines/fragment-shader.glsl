#version 300 es

precision highp float;
precision highp isampler2D;

in float v_viewportLineLength;
in vec2 v_linePoint;
in float v_viewportSize;
in vec4 v_color;
in float v_viewportBorderSize;
in vec4 v_borderColor;
in float v_viewportFeatherSize;
in float v_viewportTotalSize;

out vec4 color;

void main() {
  float distance;
  if (v_linePoint.x < 0.0) {
    distance = length(v_linePoint - vec2(0.0,0.0)) / (v_viewportTotalSize / 2.0);
  } else if (v_linePoint.x > v_viewportLineLength) {
    distance = length(v_linePoint - vec2(v_viewportLineLength,0.0)) / (v_viewportTotalSize / 2.0);
  } else {
    distance = abs(v_linePoint.y) / (v_viewportTotalSize / 2.0);
  }
  if (distance > 1.0) {
    discard;
  }
  float viewportDistance = distance * v_viewportTotalSize / 2.0;

  // Apply color
  color = vec4(0, 0, 0, 0);
  if (v_viewportSize >= v_viewportFeatherSize) {
    color = v_color;
  }

  // Apply border
  // Border starts at radius = size / 2 - border size / 2 until outside starts
  // with step of size feather size
  float borderSmoothStep;
  if(v_viewportBorderSize >= v_viewportFeatherSize) {
    borderSmoothStep = smoothstep(
      v_viewportSize / 2.0 - v_viewportBorderSize / 2.0 - v_viewportFeatherSize / 2.0,
      v_viewportSize / 2.0 - v_viewportBorderSize / 2.0 + v_viewportFeatherSize / 2.0,
      viewportDistance
    );
    color = ((1.0 - borderSmoothStep) * color) + (borderSmoothStep * v_borderColor);
  }

  // Apply outside feather
  // Outside starts at radius = size / 2 + border size / 2 until total size
  // with step of size feather size
  borderSmoothStep = smoothstep(
      v_viewportSize / 2.0 + v_viewportBorderSize / 2.0 - v_viewportFeatherSize / 2.0,
      v_viewportSize / 2.0 + v_viewportBorderSize / 2.0 + v_viewportFeatherSize / 2.0,
      viewportDistance
  );
  color = ((1.0 - borderSmoothStep) * color) + (borderSmoothStep * vec4(0, 0, 0, 0));
}
