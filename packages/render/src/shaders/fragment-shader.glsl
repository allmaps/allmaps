#version 300 es

precision highp float;
precision highp isampler2D;

uniform bool u_removeColor;
uniform vec3 u_removeColorOptionsColor;
uniform float u_removeColorOptionsThreshold;
uniform float u_removeColorOptionsHardness;

uniform bool u_colorize;
uniform vec3 u_colorizeOptionsColor;

uniform float u_opacity;
uniform float u_saturation;

uniform int u_bestScaleFactor;

uniform sampler2D u_packedTilesTexture;
uniform isampler2D u_packedTilesPositionsTexture;
uniform isampler2D u_packedTilesResourcePositionsAndDimensionsTexture;
uniform isampler2D u_packedTilesScaleFactorsTexture;

in vec2 v_resourceTrianglePoint;
in float v_triangleIndex;

out vec4 color;

void main() {
  // The treated triangle point
  int resourceTrianglePointX = int(round(v_resourceTrianglePoint.x));
  int resourceTrianglePointY = int(round(v_resourceTrianglePoint.y));

  // Reading information on packed tiles from textures
  int packedTilesCount = textureSize(u_packedTilesPositionsTexture, 0).y;
  ivec2 packedTilesTextureSize = textureSize(u_packedTilesTexture, 0);

  // Setting references for the for loop
  int smallestScaleFactorDiff = 256 * 256; // Starting with very high number
  int bestScaleFactor = 0;

  // Prepare storage for the resulting packed tiles texture point that corresponds to the treated triangle point
  vec2 packedTilesTexturePoint = vec2(0.0f, 0.0f);

  color = vec4(0.0f, 0.0f, 0.0f, 0.0f);

  bool found = false;

  // Loop through all packed tiles
  for(int index = 0; index < packedTilesCount; index += 1) {

    // Read the information of the tile
    ivec2 packedTilePosition = texelFetch(u_packedTilesPositionsTexture, ivec2(0, index), 0).rg;
    ivec4 packedTileResourcePositionAndDimension = texelFetch(u_packedTilesResourcePositionsAndDimensionsTexture, ivec2(0, index), 0);
    int packedTileScaleFactor = texelFetch(u_packedTilesScaleFactorsTexture, ivec2(0, index), 0).r;

    float packedTilePositionX = float(packedTilePosition.r);
    float packedTilePositionY = float(packedTilePosition.g);

    int packedTileResourcePositionX = packedTileResourcePositionAndDimension.r;
    int packedTileResourcePositionY = packedTileResourcePositionAndDimension.g;

    int packedTileDimensionWidth = packedTileResourcePositionAndDimension.b;
    int packedTileDimensionHeight = packedTileResourcePositionAndDimension.a;

    // If the treated triangle point is inside the tile, consider to use the tile:
    // if the scale factor is closer to the best scale factor for this map then currently known one
    // update the smallest scale factor diff
    // and compute the packed tiles texture point that corresponds to the treated triangle point
    if(resourceTrianglePointX >= packedTileResourcePositionX &&
      resourceTrianglePointX < packedTileResourcePositionX + packedTileDimensionWidth &&
      resourceTrianglePointY >= packedTileResourcePositionY &&
      resourceTrianglePointY < packedTileResourcePositionY + packedTileDimensionHeight) {
      found = true;

      int scaleFactorDiff = abs(u_bestScaleFactor - packedTileScaleFactor);

      if(scaleFactorDiff < smallestScaleFactorDiff || bestScaleFactor == 0) {

        smallestScaleFactorDiff = scaleFactorDiff;
        bestScaleFactor = packedTileScaleFactor;

        float packedTilePointX = float(resourceTrianglePointX - packedTileResourcePositionX) / float(bestScaleFactor);
        float packedTilePointY = float(resourceTrianglePointY - packedTileResourcePositionY) / float(bestScaleFactor);

        float packedTilesPointX = packedTilePositionX + packedTilePointX;
        float packedTilesPointY = packedTilePositionY + packedTilePointY;

        float packedTilesTexturePointX = round(packedTilesPointX) / float(packedTilesTextureSize.x);
        float packedTilesTexturePointY = round(packedTilesPointY) / float(packedTilesTextureSize.y);

        packedTilesTexturePoint = vec2(packedTilesTexturePointX, packedTilesTexturePointY);
      }
    }
  }

  if(found == true) {
    // Read color of the treated point at it's packed tiles texture point coordinates in the packed tiles texture
    color = texture(u_packedTilesTexture, packedTilesTexturePoint);

    // Remove background color
    if(u_removeColorOptionsThreshold > 0.0f) {
      vec3 backgroundColorDiff = color.rgb - u_removeColorOptionsColor.rgb;
      float backgroundColorDistance = length(backgroundColorDiff);
      if(u_removeColor && backgroundColorDistance < u_removeColorOptionsThreshold) {
        float amount = smoothstep(u_removeColorOptionsThreshold - u_removeColorOptionsThreshold * (1.0f - u_removeColorOptionsHardness), u_removeColorOptionsThreshold, backgroundColorDistance);
        color = vec4(color.rgb * amount, amount);
      }
    }

    // Saturation
    float gray = 0.21f * color.r + 0.71f * color.g + 0.07f * color.b;
    color = vec4(color.rgb * (u_saturation) + (gray * (1.0f - u_saturation)), color.a);

    // Colorize
    if(u_colorize) {
      color = vec4((u_colorizeOptionsColor + color.rgb) * color.a, color.a);
    }

    // Opacity
    color = vec4(color.rgb * u_opacity, color.a * u_opacity);

    // Debugging: uncomment to override color of the treated point with a color made from the point's triangle index
    vec4 debugColor = vec4(abs(sin(v_triangleIndex)), abs(sin(v_triangleIndex + 1.0f)), abs(sin(v_triangleIndex + 2.0f)), 1);
    // color = debugColor;
  }
}
