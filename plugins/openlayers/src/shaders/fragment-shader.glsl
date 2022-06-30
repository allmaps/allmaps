#version 300 es

precision highp float;
precision highp isampler2D;

// uniform Settings {
//   float u_opacity;
// };

uniform float u_opacity;
uniform vec3 u_backgroundColor;
uniform float u_backgroundColorThreshold;

uniform float u_x2Mean;
uniform float u_y2Mean;
uniform vec3 u_adfFromGeoX;
uniform vec3 u_adfFromGeoY;

uniform float[6] u_pixelToCoordinateTransform;
uniform vec2 u_viewportSize;
uniform float u_devicePixelRatio;

vec2 CRS_georef(float e1, float n1, vec3 E, vec3 N) {
  float e;
  float n;

  // if(order == 1) {
  e = E[0] + E[1] * e1 + E[2] * n1;
  n = N[0] + N[1] * e1 + N[2] * n1;

  return vec2(e, n);
}

vec2 GDALGCPTransform(float x2_mean, float y2_mean, vec3 adfFromGeoX, vec3 adfFromGeoY, vec2 point) {
  vec2 transformedPoint = CRS_georef(point.x - x2_mean, point.y - y2_mean, adfFromGeoX, adfFromGeoY);

  return transformedPoint;
}

uniform sampler2D u_tilesTexture;
uniform isampler2D u_tilePositionsTexture;
uniform isampler2D u_imagePositionsTexture;
uniform isampler2D u_scaleFactorsTexture;

out vec4 outColor;

vec2 apply(float[6] transform, vec2 coordinate) {
  float x = coordinate[0];
  float y = coordinate[1];
  return vec2(transform[0] * x + transform[2] * y + transform[4], transform[1] * x + transform[3] * y + transform[5]);
}

void main() {
  // gl_FragCoord contains canvas pixel values:
  // lower-left origin: substract y component from viewport height and
  // divide by u_devicePixelRatio to get HTML coordinates used by OpenLayers
  vec2 pixelCoords = vec2(gl_FragCoord.x / u_devicePixelRatio, u_viewportSize.y - gl_FragCoord.y / u_devicePixelRatio);

  vec2 geoCoords = apply(u_pixelToCoordinateTransform, pixelCoords);
  vec2 imageCoords = GDALGCPTransform(u_x2Mean, u_y2Mean, u_adfFromGeoX, u_adfFromGeoY, geoCoords.yx);

  ivec2 tilePositionsTextureSize = textureSize(u_tilePositionsTexture, 0);
  int tileCount = tilePositionsTextureSize.y;

  int imageX = int(round(imageCoords.x));
  int imageY = int(round(imageCoords.y));

  ivec2 tileTextureSize = textureSize(u_tilesTexture, 0);

  int texturePixelX = 0;
  int texturePixelY = 0;

  float diffX = 0.0;
  float diffY = 0.0;

  int scaleFactor = 0;

  bool found = false;

  for(int tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    ivec4 imagePosition = texelFetch(u_imagePositionsTexture, ivec2(0, tileIndex), 0);

    int tileRegionX = imagePosition.r;
    int tileRegionY = imagePosition.g;
    int tileRegionWidth = imagePosition.b;
    int tileRegionHeight = imagePosition.a;

    if(imageX >= tileRegionX && imageX < tileRegionX + tileRegionWidth && imageY >= tileRegionY && imageY < tileRegionY + tileRegionHeight) {
      found = true;

      scaleFactor = texelFetch(u_scaleFactorsTexture, ivec2(0, tileIndex), 0).r;

      diffX = float(imageX - tileRegionX) / float(scaleFactor);
      diffY = float(imageY - tileRegionY) / float(scaleFactor);

      ivec2 tilePosition = texelFetch(u_tilePositionsTexture, ivec2(0, tileIndex), 0).rg;

      texturePixelX = tilePosition.r + int(round(diffX));
      texturePixelY = tilePosition.g + int(round(diffY));
    }
  }

  outColor = vec4(0.0, 0.0, 0.0, 0.0);

  if(found == true) {
    vec4 color = texture(u_tilesTexture, vec2(float(texturePixelX) / float(tileTextureSize.x), float(texturePixelY) / float(tileTextureSize.y)));
    outColor = vec4(color.rgb * u_opacity, color.a * u_opacity);

    vec3 backgroundDiff = color.rgb - u_backgroundColor.rgb;
    if (length(backgroundDiff) < u_backgroundColorThreshold) {
      // float s = 0.02;
      // float a = mix(0.0, color.a * u_opacity, max(length(backgroundDiff), s));
      // outColor = vec4(color.rgb * u_opacity, a);

      outColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
  }
}