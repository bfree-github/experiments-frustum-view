/* Copyright 2020 Graphcomp - ALL RIGHTS RESERVED */

const shaders = {};

shaders.fragment =
{
  type: 'x-shader/x-fragment',
  code:
`
// Fragment shader
precision highp float;

//varying vec2 vTextureCoord;
//uniform sampler2D uTexture;
uniform vec3 uColor;

void main(void)
{
  //vec4 textureColor = texture2D(uTexture, vTextureCoord);
  //gl_FragColor = textureColor;
  gl_FragColor = vec4(uColor, 1.0);
}
`
};

shaders.vertex =
{
  type: 'x-shader/x-vertex',
  code:
`
// Vertex shader
attribute vec3 aVertexPosition;
//attribute vec2 aTextureCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
//varying vec2 vTextureCoord;

void main(void)
{
  vec4 mvPosition = uMVMatrix * vec4(aVertexPosition.xyz, 1.0);
  gl_Position = uPMatrix * mvPosition;

  //vTextureCoord = aTextureCoord;
}
`
};

export {shaders};
