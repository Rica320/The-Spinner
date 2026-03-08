attribute float aSize;
attribute float aOpacity;
attribute vec3 aColor;
varying float vOpacity;
varying vec3 vColor;
uniform float uTime;

void main() {
    vOpacity = aOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Subtle twinkle: vary point size over time per star
    float twinkle = 0.8 + 0.2 * sin(uTime * 2.0 + aOpacity * 100.0);

    vColor = aColor;

    gl_PointSize = (aSize * 2.5 + 0.5) * twinkle * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}