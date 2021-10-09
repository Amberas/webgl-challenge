const atmosphereFragmentShader = `
    varying vec3 vertexNormal;
    
    void main() {
        float intensity = pow(0.35 - dot(vertexNormal, vec3(0, 0, 1.0)), 2.0);
        gl_FragColor = vec4 (0.8, 0.3, 0, 0) * intensity;
    }
`

export default atmosphereFragmentShader;