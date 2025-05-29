const initSpaceAnomalyBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Set background color (deep space)
    scene.background = new THREE.Color(0x000814);
    
    // Create a subtle fog for depth
    scene.fog = new THREE.FogExp2(0x000814, 0.02);
    
    // Setup camera
    camera.position.z = 30;
    camera.position.y = 10;
    camera.lookAt(0, 0, 0);
    
    // Ambient and directional light
    const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x6666ff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create a pulsing point light at the center of the anomaly
    const anomalyLight = new THREE.PointLight(0x00ffff, 1, 50);
    anomalyLight.position.set(0, 0, 0);
    scene.add(anomalyLight);
    
    // Secondary pulsing lights with different colors
    const redLight = new THREE.PointLight(0xff3366, 1, 30);
    redLight.position.set(5, 5, 5);
    scene.add(redLight);
    
    const purpleLight = new THREE.PointLight(0x9933ff, 1, 30);
    purpleLight.position.set(-5, -5, -5);
    scene.add(purpleLight);
    
    // Grid parameters
    const gridSize = 20; // Size of the full grid
    const gridResolution = 30; // Number of segments
    const gridGeometry = new THREE.BoxGeometry(
        gridSize, gridSize, gridSize, 
        gridResolution, gridResolution, gridResolution
    );
    
    // Create a custom shader material for the grid
    const gridMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            anomalyCenter: { value: new THREE.Vector3(0, 0, 0) },
            anomalyStrength: { value: 1.0 },
            anomalyRadius: { value: 5.0 },
            noiseScale: { value: 0.5 },
            gridColor1: { value: new THREE.Color(0x00ffff) },  // Cyan
            gridColor2: { value: new THREE.Color(0xff33cc) },  // Pink
            pulseSpeed: { value: 1.0 },
            morphSpeed: { value: 0.5 },
        },
        vertexShader: `
            uniform float time;
            uniform vec3 anomalyCenter;
            uniform float anomalyStrength;
            uniform float anomalyRadius;
            uniform float noiseScale;
            uniform float morphSpeed;
            
            varying vec3 vPosition;
            varying float vDistortion;
            varying vec3 vNormal;
            
            // Simplex 3D noise function
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                
                // First corner
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                
                // Other corners
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                
                // Permutations
                i = mod289(i);
                vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                      
                // Gradients: 7x7 points over a square, mapped onto an octahedron.
                float n_ = 0.142857142857; // 1.0/7.0
                vec3 ns = n_ * D.wyz - D.xzx;
                
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                
                // Normalise gradients
                vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;
                
                // Mix final noise value
                vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
                m = m * m;
                return 105.0 * dot(m*m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
            }
            
            // Fractal Brownian Motion (fBm) for more complex noise
            float fbm(vec3 p) {
                float value = 0.0;
                float amplitude = 1.0;
                float frequency = 1.0;
                float lacunarity = 2.0;  // Gap between successive frequencies
                float persistence = 0.5;  // How much each octave contributes
                
                // Add 6 octaves of noise
                for (int i = 0; i < 6; i++) {
                    // Animate the noise over time
                    value += amplitude * snoise(p * frequency + time * 0.1 * float(i));
                    frequency *= lacunarity;
                    amplitude *= persistence;
                }
                
                return value;
            }
            
            void main() {
                vPosition = position;
                vNormal = normal;
                
                // Get distance from point to anomaly center
                float distance = length(position - anomalyCenter);
                
                // Calculate influence factor based on distance to anomaly (smoother falloff)
                float influence = 1.0 - smoothstep(0.0, anomalyRadius, distance);
                
                // Add time-dependent variations
                float timeFactor = sin(time * morphSpeed) * 0.5 + 0.5;
                
                // Generate fractal noise to modulate the distortion
                vec3 noiseInput = position * noiseScale + vec3(time * 0.2, 0.0, time * 0.1);
                float noise = fbm(noiseInput);
                
                // Calculate the distortion vector
                vec3 distortionDirection;
                
                // Create different distortion effects based on position and time
                if (distance < anomalyRadius * 0.3) {
                    // Inner core: Spherical expansion/contraction
                    distortionDirection = normalize(position - anomalyCenter);
                    float breathe = sin(time * 0.5) * 0.5 + 0.5;
                    float pulseWave = sin(distance * 5.0 - time * 2.0) * 0.5 + 0.5;
                    influence *= breathe * pulseWave;
                    
                    // Add spiral component
                    float spiralAngle = time * 0.5 + distance * 2.0;
                    vec3 spiral = vec3(
                        cos(spiralAngle) * position.y - sin(spiralAngle) * position.z,
                        sin(spiralAngle) * position.x + cos(spiralAngle) * position.z,
                        cos(spiralAngle) * position.x - sin(spiralAngle) * position.y
                    );
                    distortionDirection = mix(distortionDirection, normalize(spiral), 0.5);
                    
                } else if (distance < anomalyRadius * 0.7) {
                    // Middle region: Vortex/spiral
                    float angle = time * 0.3 + distance * 3.0;
                    distortionDirection = vec3(
                        cos(angle) * sin(time * 0.2),
                        sin(angle) * sin(time * 0.3),
                        cos(time * 0.2)
                    );
                    
                    // Add vertical pulse waves
                    float verticalPulse = sin(position.y * 4.0 + time * 3.0) * cos(position.x * 3.0 - time);
                    influence *= 0.7 + verticalPulse * 0.3;
                    
                } else {
                    // Outer region: Wave-like distortions
                    float wave = sin(position.x * 2.0 + time) * 
                                 cos(position.y * 2.0 + time * 0.7) * 
                                 sin(position.z * 2.0 + time * 0.5);
                    distortionDirection = normal * wave;
                    influence *= 0.5 + 0.5 * sin(distance * 2.0 - time * 1.5);
                }
                
                // Apply noise modulation to distortion direction
                distortionDirection = mix(distortionDirection, vec3(noise, noise, noise), 0.3);
                
                // Scale distortion by anomaly strength and influence
                vec3 distortion = distortionDirection * anomalyStrength * influence * (1.0 + noise * 0.5);
                
                // Store distortion amount for fragment shader
                vDistortion = length(distortion) / anomalyStrength;
                
                // Apply distortion to position
                vec3 displacedPosition = position + distortion * (0.5 + timeFactor);
                
                // Output final position
                gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 gridColor1;
            uniform vec3 gridColor2;
            uniform float pulseSpeed;
            
            varying vec3 vPosition;
            varying float vDistortion;
            varying vec3 vNormal;
            
            void main() {
                // Calculate grid pattern
                vec3 pos = vPosition * 2.0; // Scale for finer grid
                
                // Create grid lines with dynamic thickness
                float lineThickness = 0.03 + 0.02 * sin(time * pulseSpeed);
                float gridX = smoothstep(lineThickness, 0.0, abs(fract(pos.x) - 0.5));
                float gridY = smoothstep(lineThickness, 0.0, abs(fract(pos.y) - 0.5));
                float gridZ = smoothstep(lineThickness, 0.0, abs(fract(pos.z) - 0.5));
                
                // Combine the grid lines
                float grid = max(max(gridX, gridY), gridZ);
                
                // Adjust grid brightness based on distortion
                grid *= (0.5 + vDistortion * 2.0);
                
                // Color based on distortion and time
                vec3 color = mix(gridColor1, gridColor2, 0.5 + 0.5 * sin(vDistortion * 5.0 + time));
                
                // Add slight distortion effect to the color
                float distortionColor = sin(vDistortion * 10.0 - time * 2.0) * 0.5 + 0.5;
                color = mix(color, vec3(distortionColor, 1.0 - distortionColor, distortionColor * 0.5), 0.3);
                
                // Edge highlighting
                float edgeFactor = max(0.0, dot(normalize(vNormal), normalize(vec3(1.0, 1.0, 1.0))));
                float edge = smoothstep(0.3, 0.7, edgeFactor);
                color = mix(color * 1.5, color, edge);
                
                // Apply grid color with glow effect
                vec3 finalColor = color * (grid * 1.5);
                
                // Add ambient glow
                finalColor += color * vDistortion * 0.3;
                
                // Add pulsing overall brightness
                float pulse = 0.8 + 0.2 * sin(time * pulseSpeed * 0.5);
                finalColor *= pulse;
                
                // Set alpha based on grid intensity and distortion
                float alpha = min(1.0, grid + vDistortion * 0.2);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        wireframe: false
    });
    
    // Create grid mesh
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    scene.add(gridMesh);
    
    // Create a secondary mesh for the inner anomaly core
    const coreGeometry = new THREE.IcosahedronGeometry(3, 4);
    const coreMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0x00ffff) },
            color2: { value: new THREE.Color(0xff33cc) }
        },
        vertexShader: `
            uniform float time;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            // Same snoise and fbm functions from the grid shader
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                
                // First corner
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                
                // Other corners
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                
                // Permutations
                i = mod289(i);
                vec4 p = permute(permute(permute(
                        i.z + vec4(0.0, i1.z, i2.z, 1.0))
                      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                      
                // Gradients
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                
                // Normalise gradients
                vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;
                
                // Mix final noise value
                vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
                m = m * m;
                return 105.0 * dot(m*m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
            }
            
            float fbm(vec3 p) {
                float value = 0.0;
                float amplitude = 1.0;
                float frequency = 1.0;
                
                for (int i = 0; i < 5; i++) {
                    value += amplitude * snoise(p * frequency + time * 0.2 * float(i));
                    frequency *= 2.17;
                    amplitude *= 0.62;
                }
                
                return value;
            }
            
            void main() {
                vPosition = position;
                vNormal = normal;
                
                // Complex displacement using fractal noise
                float noise = fbm(position * 0.5 + vec3(time * 0.3));
                
                // Displacement amount varies over time with pulsing effects
                float displacement = noise * (1.0 + 0.5 * sin(time));
                
                // Apply morphing with multiple frequencies
                vec3 displacedPosition = position;
                displacedPosition += normal * displacement * 1.5;
                displacedPosition += normal * sin(position.x * 2.0 + time) * 0.2;
                displacedPosition += normal * cos(position.y * 3.0 + time * 0.7) * 0.2;
                displacedPosition += normal * sin(position.z * 2.5 + time * 0.5) * 0.2;
                
                // Add rotation effect
                float rotSpeed = time * 0.5;
                vec3 rotatedPos = vec3(
                    displacedPosition.x * cos(rotSpeed) - displacedPosition.z * sin(rotSpeed),
                    displacedPosition.y,
                    displacedPosition.x * sin(rotSpeed) + displacedPosition.z * cos(rotSpeed)
                );
                
                // Output transformed position
                gl_Position = projectionMatrix * modelViewMatrix * vec4(rotatedPos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                // Calculate animated color patterns
                float pattern = sin(vPosition.x * 10.0 + time) * 
                                cos(vPosition.y * 8.0 + time * 0.7) * 
                                sin(vPosition.z * 6.0 + time * 0.5);
                
                // Mix colors based on pattern and time
                vec3 color = mix(color1, color2, 0.5 + 0.5 * pattern);
                
                // Add light interaction and fresnel-like edge glow
                vec3 viewDir = normalize(cameraPosition - vPosition);
                float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
                rim = pow(rim, 3.0);
                
                // Add pulsing glow
                float glow = 0.8 + 0.4 * sin(time * 2.0);
                
                // Combine effects
                vec3 finalColor = color * (0.5 + 0.5 * pattern);
                finalColor += color * rim * 2.0 * glow;
                
                // Pulsing opacity
                float alpha = 0.2 + 0.3 * sin(time) + 0.5 * rim;
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);
    
    // Create energy particles around the anomaly
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleColors = new Float32Array(particleCount * 3);
    const particleData = new Float32Array(particleCount * 3); // Store radius, angle, and speed
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random spherical coordinates
        const radius = 3 + Math.random() * 15; // Distance from center
        const theta = Math.random() * Math.PI * 2; // Horizontal angle
        const phi = Math.acos(2 * Math.random() - 1); // Vertical angle (arccos gives proper distribution)
        
        // Convert to Cartesian coordinates
        particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        particlePositions[i3 + 2] = radius * Math.cos(phi);
        
        // Store orbit data
        particleData[i3] = radius; // Orbit radius
        particleData[i3 + 1] = theta; // Current angle
        particleData[i3 + 2] = 0.2 + Math.random() * 0.8; // Orbit speed multiplier
        
        // Vary size based on distance
        particleSizes[i] = 0.1 + Math.random() * 0.3 * (1.0 - Math.min(1.0, radius / 20));
        
        // Color based on radius (inner particles more blue, outer more purple)
        const t = Math.min(1.0, radius / 18);
        particleColors[i3] = 0.0 + t * 0.8; // R: increases with radius
        particleColors[i3 + 1] = 0.5 + Math.random() * 0.5; // G: random mid-high
        particleColors[i3 + 2] = 0.8 + Math.random() * 0.2; // B: high
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute('orbitData', new THREE.BufferAttribute(particleData, 3));
    
    // Create particle material
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pointTexture: { value: createParticleTexture() }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            attribute vec3 orbitData;
            
            uniform float time;
            
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                
                // Extract orbit data
                float radius = orbitData.x;
                float angle = orbitData.y;
                float speed = orbitData.z;
                
                // Calculate orbit motion
                float currentAngle = angle + time * speed;
                
                // Offset to create different orbit planes
                float planeOffset = sin(angle * 10.0) * 3.14159;
                
                // Create position on the orbit
                vec3 orbitPosition;
                orbitPosition.x = radius * cos(currentAngle);
                orbitPosition.z = radius * sin(currentAngle);
                
                // Y follows a more complex path
                orbitPosition.y = radius * sin(currentAngle + planeOffset) * 0.5;
                
                // Add some oscillation for more interesting movement
                float oscillation = sin(time * 2.0 + angle * 5.0) * radius * 0.1;
                orbitPosition += normalize(position) * oscillation;
                
                // Calculate size variation
                float sizeVariation = 0.8 + 0.4 * sin(time * 3.0 + angle * 10.0);
                
                // Set point size
                vec4 mvPosition = modelViewMatrix * vec4(orbitPosition, 1.0);
                gl_PointSize = size * sizeVariation * (300.0 / -mvPosition.z);
                
                // Output position
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform sampler2D pointTexture;
            
            varying vec3 vColor;
            
            void main() {
                // Get texture
                vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                
                // Add time-based color pulsing
                vec3 color = vColor;
                color *= 0.8 + 0.4 * sin(time * 2.0 + vColor.r * 10.0);
                
                gl_FragColor = vec4(color, texColor.a);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    
    // Create particle texture
    function createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    // Create particles mesh
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update shader uniforms
        gridMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    });
    
    // Animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
        const elapsedTime = clock.getElapsedTime();
        
        // Update shader uniforms
        gridMaterial.uniforms.time.value = elapsedTime;
        coreMaterial.uniforms.time.value = elapsedTime;
        particleMaterial.uniforms.time.value = elapsedTime;
        
        // Animate anomaly parameters
        const anomalyStrength = 2.0 + Math.sin(elapsedTime * 0.3) * 0.5;
        gridMaterial.uniforms.anomalyStrength.value = anomalyStrength;
        
        const anomalyRadius = 5.0 + Math.sin(elapsedTime * 0.5) * 1.5;
        gridMaterial.uniforms.anomalyRadius.value = anomalyRadius;
        
        // Move anomaly center slightly for more dynamic effect
        const centerX = Math.sin(elapsedTime * 0.1) * 2.0;
        const centerY = Math.cos(elapsedTime * 0.15) * 1.5;
        const centerZ = Math.sin(elapsedTime * 0.12) * 2.0;
        gridMaterial.uniforms.anomalyCenter.value.set(centerX, centerY, centerZ);
        
        // Move core mesh to follow anomaly center
        coreMesh.position.set(centerX, centerY, centerZ);
        
        // Rotate core mesh for additional effect
        coreMesh.rotation.x = elapsedTime * 0.1;
        coreMesh.rotation.y = elapsedTime * 0.15;
        coreMesh.rotation.z = elapsedTime * 0.05;
        
        // Update lights
        const lightIntensity = 1.5 + Math.sin(elapsedTime * 2.0) * 0.5;
        anomalyLight.intensity = lightIntensity;
        anomalyLight.position.set(centerX, centerY, centerZ);
        
        // Move secondary lights in orbits
        redLight.position.set(
            Math.sin(elapsedTime * 0.5) * 10,
            Math.cos(elapsedTime * 0.3) * 5,
            Math.sin(elapsedTime * 0.7) * 8
        );
        
        purpleLight.position.set(
            Math.cos(elapsedTime * 0.4) * 8,
            Math.sin(elapsedTime * 0.6) * 7,
            Math.cos(elapsedTime * 0.5) * 12
        );
        
        // Smoothly move camera
        const cameraRadius = 30 + Math.sin(elapsedTime * 0.1) * 5;
        const cameraHeight = 10 + Math.sin(elapsedTime * 0.2) * 5;
        const cameraAngle = elapsedTime * 0.1;
        
        camera.position.x = Math.sin(cameraAngle) * cameraRadius;
        camera.position.z = Math.cos(cameraAngle) * cameraRadius;
        camera.position.y = cameraHeight;
        
        // Look at the anomaly center
        camera.lookAt(centerX, centerY, centerZ);
        
        // Add mouse influence to camera position if available
        if (window.mouseX !== undefined && window.mouseY !== undefined) {
            camera.position.x += window.mouseX * 0.05;
            camera.position.y += window.mouseY * 0.05;
        }
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Call animate again on the next frame
        requestAnimationFrame(animate);
    };
    
    // Track mouse movement for camera interaction
    window.mouseX = 0;
    window.mouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        window.mouseX = (event.clientX - window.innerWidth / 2) * 0.05;
        window.mouseY = (event.clientY - window.innerHeight / 2) * 0.05;
    });
    
    // Start animation
    animate();
};

// Function to setup the background canvas for the entire page
const setupPageBackground = () => {
    // Check if we already have a canvas
    let canvas = document.getElementById('bg-canvas');
    
    // If no canvas exists, create one
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'bg-canvas';
        
        // Set canvas styles for fullscreen background
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '-1';
        canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    }
    
    // Add the canvas to the body as a fixed background
    if (canvas.parentElement !== document.body) {
        document.body.appendChild(canvas);
    }
    
    return canvas;
};

// Add CSS to make content readable over the background
const addBackgroundCSS = () => {
    // Create a style element if it doesn't exist
    let style = document.getElementById('background-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'background-styles';
        document.head.appendChild(style);
        
        // Add CSS rules
        style.textContent = `
            body {
                background-color: transparent !important;
                position: relative;
                z-index: 1;
                color: #fff;
            }
            
            main, article, section, .content, .container {
                position: relative;
                z-index: 1;
                background-color: rgba(0, 8, 20, 0.7);
                padding: 20px;
                border-radius: 5px;
                color: #fff;
            }
            
            h1, h2, h3, h4, h5, h6 {
                color: #ffffff;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            }
            
            a {
                color: #00ffff;
                text-shadow: 0 0 5px rgba(0, 255, 255, 0.5);
            }
            
            /* Style adjustments for text contrast */
            p, li, span, div {
                text-shadow: 0 0 5px rgba(0, 0, 0, 0.9);
            }
            
            /* Add a subtle background to text containers */
            article, .content, .container, .card, .post {
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
                margin-bottom: 20px;
                border: 1px solid rgba(0, 255, 255, 0.1);
            }
            
            /* Buttons and interactive elements */
            button, .btn {
                border: 1px solid rgba(0, 255, 255, 0.3);
                box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
                transition: all 0.3s ease;
            }
            
            button:hover, .btn:hover {
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
            }
            
            /* Form elements */
            input, textarea, select {
                background-color: rgba(0, 8, 20, 0.7);
                border: 1px solid rgba(0, 255, 255, 0.2);
                color: #fff;
            }
        `;
    }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    setupPageBackground();
    addBackgroundCSS();
    initSpaceAnomalyBackground();
    
    // Add a mutation observer to ensure the background works on dynamically loaded pages
    const observer = new MutationObserver((mutations) => {
        let needsReattach = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // Check if our canvas was removed
                const canvas = document.getElementById('bg-canvas');
                if (!canvas || !document.body.contains(canvas)) {
                    needsReattach = true;
                }
            }
        });
        
        if (needsReattach) {
            setupPageBackground();
            initSpaceAnomalyBackground();
        }
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});