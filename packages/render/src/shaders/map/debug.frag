// Triangles
if(bool(u_debug)) {
  // Old approach with color
  // float triangleIndex = floor(v_trianglePointIndex / 3.0);
  // color = vec4(abs(sin(triangleIndex)), abs(sin(triangleIndex + 1.0f)), abs(sin(triangleIndex + 2.0f)), 1);

  float dist = min(min(v_trianglePointBarycentric.x, v_trianglePointBarycentric.y), v_trianglePointBarycentric.z);
  // Convert the desired border width from pixels to normalized units (0-1)
  // This makes the border width consistent regardless of triangle size
  float pixelSize = length(vec2(dFdx(dist), dFdy(dist)));
  float pixelWith = 2.0;
  float threshold = pixelWith * pixelSize;

  if(dist < threshold) {
    color = vec4(0, 0, 0, 1.0);
  }
}
