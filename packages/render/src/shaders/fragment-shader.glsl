#version 300 es

precision highp float;
precision highp isampler2D;

uniform float u_opacity;

uniform bool u_removeBackgroundColor;
uniform vec3 u_backgroundColor;
uniform float u_backgroundColorThreshold;
uniform float u_backgroundColorHardness;

uniform bool u_colorize;
uniform vec3 u_colorizeColor;

uniform mat4 u_pixelToImageMatrix;

uniform sampler2D u_tilesTexture;
uniform isampler2D u_tilePositionsTexture;
uniform isampler2D u_imagePositionsTexture;
uniform isampler2D u_scaleFactorsTexture;

out vec4 outColor;

void main() {
  vec2 imageCoords = (u_pixelToImageMatrix * vec4(gl_FragCoord.xy, 0.0, 1.0)).xy;

  ivec2 tilePositionsTextureSize = textureSize(u_tilePositionsTexture, 0);
  int tileCount = tilePositionsTextureSize.y;

  int imageX = int(round(imageCoords.x));
  int imageY = int(round(imageCoords.y));

  ivec2 tileTextureSize = textureSize(u_tilesTexture, 0);

  int tileRegionX = 0;
  int tileRegionY = 0;

  float diffX = 0.0;
  float diffY = 0.0;

  ivec2 tilePosition = ivec2(0, 0);

  int scaleFactor = 0;

  bool found = false;

  for(int tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
    ivec4 imagePosition = texelFetch(u_imagePositionsTexture, ivec2(0, tileIndex), 0);

    tileRegionX = imagePosition.r;
    tileRegionY = imagePosition.g;

    int tileRegionWidth = imagePosition.b;
    int tileRegionHeight = imagePosition.a;

    if(imageX >= tileRegionX && imageX < tileRegionX + tileRegionWidth && imageY >= tileRegionY && imageY < tileRegionY + tileRegionHeight) {
      found = true;

      scaleFactor = texelFetch(u_scaleFactorsTexture, ivec2(0, tileIndex), 0).r;

      diffX = float(imageX - tileRegionX) / float(scaleFactor);
      diffY = float(imageY - tileRegionY) / float(scaleFactor);

      tilePosition = texelFetch(u_tilePositionsTexture, ivec2(0, tileIndex), 0).rg;
    }
  }

  outColor = vec4(0.0, 0.0, 0.0, 0.0);

  if(found == true) {
    float texturePixelX = float(tilePosition.r) + diffX;
    float texturePixelY = float(tilePosition.g) + diffY;

    int texturePixelXRounded = int(round(texturePixelX));
    int texturePixelYRounded = int(round(texturePixelY));

    // Read pixel from texture
    outColor = texture(u_tilesTexture, vec2(float(texturePixelXRounded) / float(tileTextureSize.x), float(texturePixelYRounded) / float(tileTextureSize.y)));

    // Remove background color
    if(u_backgroundColorThreshold > 0.0) {
      vec3 backgroundColorDiff = outColor.rgb - u_backgroundColor.rgb;
      float backgroundColorDistance = length(backgroundColorDiff);
      if(u_removeBackgroundColor && backgroundColorDistance < u_backgroundColorThreshold) {
        float amount = smoothstep(u_backgroundColorThreshold - u_backgroundColorThreshold * (1.0 - u_backgroundColorHardness), u_backgroundColorThreshold, backgroundColorDistance);
        outColor = vec4(outColor.rgb * amount, amount);
      }
    }

    // Colorize
    if(u_colorize) {
      outColor = vec4((u_colorizeColor + outColor.rgb) * outColor.a, outColor.a);
    }

    // Set opacity
    outColor = vec4(outColor.rgb * u_opacity, outColor.a * u_opacity);
  }
}
