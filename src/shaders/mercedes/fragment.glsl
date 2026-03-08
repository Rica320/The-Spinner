uniform sampler2D uStarTexture;
    varying float vOpacity;
    varying vec3 vColor;

    void main() {
        vec4 tex = texture2D(uStarTexture, gl_PointCoord);

        // discard transparent pixels
        if (tex.a < 0.1) discard;

        // final color: texture modulated by star color
        float alpha = tex.a * vOpacity; // apply alpha + twinkle
        gl_FragColor = vec4(tex.rgb * vColor, alpha);
    }