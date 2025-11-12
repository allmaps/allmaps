float viewportWidth = 4.0;

if(bool(u_debugTriangles)) {
  // Old approach with color
  // float triangleIndex = floor(v_trianglePointIndex / 3.0);
  // color = vec4(abs(sin(triangleIndex)), abs(sin(triangleIndex + 1.0f)), abs(sin(triangleIndex + 2.0f)), 1);

  float barycentricTriangleDist = min(min(v_trianglePointBarycentric.x, v_trianglePointBarycentric.y), v_trianglePointBarycentric.z);
  // Convert the desired border width from pixels to normalized units (0-1)
  // This makes the border width consistent regardless of triangle size
  float barycentricTriangleDistPixelSize = length(vec2(dFdx(barycentricTriangleDist), dFdy(barycentricTriangleDist)));
  // Devide width by two, since most edges are displayed on two adjacent triangles.
  float TriangleDistThreshold = viewportWidth * barycentricTriangleDistPixelSize / 2.0;

  if(barycentricTriangleDist < TriangleDistThreshold) {
    color = vec4(0.0, 0.0, 0.0, 1.0);
  }
}

if(bool(u_debugTiles)) {
  float resourceDist = min(cachedTilesTexturePoint.x, cachedTilesTexturePoint.y);
  // Convert the desired border width from pixels to normalized units (0-1)
  // This makes the border width consistent regardless of triangle size
  float resourceDistPixelSize = length(vec2(dFdx(resourceDist), dFdy(resourceDist)));
  float resourceDistThreshold = viewportWidth * resourceDistPixelSize;

  if(resourceDist < resourceDistThreshold) {
    color = vec4(0.0, 0.0, 1.0, 1.0);
  }
}
