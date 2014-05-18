#ifdef GL_ES
precision mediump float;
#endif

uniform float uVertexScale;
uniform vec2 uAspectScale;

attribute vec2 aPosition;
attribute vec3 aColor;
attribute vec2 aTexCoord0, aTexCoord1;

varying vec3 vColor;
varying vec2 vTexCoord0, vTexCoord1;

void main() {
  gl_Position = vec4(aPosition.x * uVertexScale / uAspectScale.x,
                     aPosition.y / uAspectScale.y, 0,1);
  vColor = aColor;
  vTexCoord0 = aTexCoord0;
  vTexCoord1 = aTexCoord1;
}
