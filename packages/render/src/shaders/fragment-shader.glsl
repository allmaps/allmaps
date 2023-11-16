#version 300 es

precision highp float;
precision highp isampler2D;

uniform int u_bestScaleFactor;
uniform float u_opacity;
uniform float u_saturation;

uniform bool u_removeBackgroundColor;
uniform vec3 u_backgroundColor;
uniform float u_backgroundColorThreshold;
uniform float u_backgroundColorHardness;

uniform bool u_colorize;
uniform vec3 u_colorizeColor;

uniform sampler2D u_tilesTexture;
uniform isampler2D u_tilePositionsTexture;
uniform isampler2D u_imagePositionsTexture;
uniform isampler2D u_scaleFactorsTexture;

in vec2 v_resource_triangle_coordinates;
in float v_triangle_index;

out vec4 outColor;

void main() {
  vec2 imageCoords = v_resource_triangle_coordinates;

  ivec2 tilePositionsTextureSize = textureSize(u_tilePositionsTexture, 0);
  int tileCount = tilePositionsTextureSize.y;

  int imageX = int(round(imageCoords.x));
  int imageY = int(round(imageCoords.y));

  ivec2 tileTextureSize = textureSize(u_tilesTexture, 0);

  int tileRegionX = 0;
  int tileRegionY = 0;

  float diffX = 0.0f;
  float diffY = 0.0f;

  ivec2 tilePosition = ivec2(0, 0);

  int scaleFactor = 0;
  // A very high scale factor that's higher than any possible scale factor
  int smallestScaleFactorDiff = 256 * 256;

  bool found = false;

  for(int tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    ivec4 imagePosition = texelFetch(u_imagePositionsTexture, ivec2(0, tileIndex), 0);

    tileRegionX = imagePosition.r;
    tileRegionY = imagePosition.g;

    int tileRegionWidth = imagePosition.b;
    int tileRegionHeight = imagePosition.a;

    if(imageX >= tileRegionX && imageX < tileRegionX + tileRegionWidth && imageY >= tileRegionY && imageY < tileRegionY + tileRegionHeight) {
      found = true;

      int tileIndexScaleFactor = texelFetch(u_scaleFactorsTexture, ivec2(0, tileIndex), 0).r;

      int scaleFactorDiff = abs(u_bestScaleFactor - tileIndexScaleFactor);
      if(scaleFactorDiff < smallestScaleFactorDiff || scaleFactor == 0) {

        smallestScaleFactorDiff = scaleFactorDiff;
        scaleFactor = tileIndexScaleFactor;

        diffX = float(imageX - tileRegionX) / float(scaleFactor);
        diffY = float(imageY - tileRegionY) / float(scaleFactor);

        tilePosition = texelFetch(u_tilePositionsTexture, ivec2(0, tileIndex), 0).rg;
      }
    }
  }

  outColor = vec4(0.0f, 0.0f, 0.0f, 0.0f);

  if(found == true) {
    float texturePixelX = float(tilePosition.r) + diffX;
    float texturePixelY = float(tilePosition.g) + diffY;

    int texturePixelXRounded = int(round(texturePixelX));
    int texturePixelYRounded = int(round(texturePixelY));

    // Read pixel from texture
    outColor = texture(u_tilesTexture, vec2(float(texturePixelXRounded) / float(tileTextureSize.x), float(texturePixelYRounded) / float(tileTextureSize.y)));

    // Remove background color
    if(u_backgroundColorThreshold > 0.0f) {
      vec3 backgroundColorDiff = outColor.rgb - u_backgroundColor.rgb;
      float backgroundColorDistance = length(backgroundColorDiff);
      if(u_removeBackgroundColor && backgroundColorDistance < u_backgroundColorThreshold) {
        float amount = smoothstep(u_backgroundColorThreshold - u_backgroundColorThreshold * (1.0f - u_backgroundColorHardness), u_backgroundColorThreshold, backgroundColorDistance);
        outColor = vec4(outColor.rgb * amount, amount);
      }
    }

    // Saturation
    float gray = 0.21f * outColor.r + 0.71f * outColor.g + 0.07f * outColor.b;
    outColor = vec4(outColor.rgb * (u_saturation) + (gray * (1.0f - u_saturation)), outColor.a);

    // Colorize
    if(u_colorize) {
      outColor = vec4((u_colorizeColor + outColor.rgb) * outColor.a, outColor.a);
    }

    // Set opacity
    outColor = vec4(outColor.rgb * u_opacity, outColor.a * u_opacity);

    // Debugging: uncomment to show triangles
    float color = sin(v_triangle_index * 4.0f);
    outColor = vec4(color, fract(color + 0.3f), fract(color + 0.6f), 1);
  }
}
