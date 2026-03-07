uniform sampler2D uPictureTexture;

varying vec3 vColor;

void main()
{

    vec2 uv = gl_PointCoord;
    float colorStrength = vColor.r + vColor.r + vColor.b;

    if (colorStrength == 0.0)
        discard;

    gl_FragColor = vec4(vColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}