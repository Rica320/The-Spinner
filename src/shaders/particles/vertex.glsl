uniform vec2 uResolution;
uniform sampler2D uPictureTexture;
uniform sampler2D uDisplacementTexture;
uniform float uPixelRatio;

attribute float aIntensity;
attribute float aAngle;

varying vec3 vColor;

void main()
{
    // Displacement
    vec3 newPosition = position;
    float displacementIntensity = texture(uDisplacementTexture, uv).r;
    displacementIntensity = smoothstep(0.1, 0.3, displacementIntensity);

    vec3 displacement = vec3(
        cos(aAngle) * 0.2,
        sin(aAngle) * 0.2,
        1.0
    );
    displacement = normalize(displacement);
    displacement *= displacementIntensity;
    displacement *= 3.0;
    displacement *= aIntensity;
    newPosition += displacement;

    // Final Position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Picture
    float pictureIntensityR = texture(uPictureTexture, uv).r;
    float pictureIntensityG = texture(uPictureTexture, uv).g;
    float pictureIntensityB = texture(uPictureTexture, uv).b;


    // Varyings
    vColor = vec3(pow(pictureIntensityR, 2.0),pow(pictureIntensityG, 2.0),pow(pictureIntensityB, 2.0));

    // Point size - account for pixel ratio and perspective
    gl_PointSize = 45.0 * uPixelRatio;
    gl_PointSize *= (1.0 / - viewPosition.z);
}