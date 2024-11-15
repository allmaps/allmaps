// Triangles
// TODO: make this a rendering option
if(bool(u_debug)) {
  // float triangleIndex = floor(v_trianglePointIndex / 3.0);
  // color = vec4(abs(sin(triangleIndex)), abs(sin(triangleIndex + 1.0f)), abs(sin(triangleIndex + 2.0f)), 1);

  float dist = 0.99; // Optional improvement: scale with triangle area.
  if(
    v_trianglePointBarycentric.x + v_trianglePointBarycentric.y > dist ||
    v_trianglePointBarycentric.y + v_trianglePointBarycentric.z > dist ||
    v_trianglePointBarycentric.z + v_trianglePointBarycentric.x > dist
  )
  color = vec4(0, 0, 0, 1);
}
