const init3DFractalBackground = () => {
            // Get the canvas element
            const canvas = document.getElementById('bg-canvas');
            
            // Create scene, camera, and renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
            const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            
            // Set renderer size and pixel ratio
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // Camera position and controls
            camera.position.set(0, 0, 2);
            
            // Initial orbit variables
            let isDragging = false;
            let previousMousePosition = { x: 0, y: 0 };
            let targetRotationY = 0;
            let targetRotationX = 0;
            let currentRotationY = 0;
            let currentRotationX = 0;
            
            // Store key states
            const keyState = {
                w: false,
                a: false,
                s: false,
                d: false,
                ArrowUp: false,
                ArrowDown: false,
                ArrowLeft: false,
                ArrowRight: false,
                q: false,
                e: false
            };
            
            // Parameters for the fractal
            const params = {
                power: 8.0,
                iterations: 10,
                bailout: 2.0,
                colorScale: 0.5,
                colorCycles: 3.0,
                colorOffset: 0.5,
                distance: 2.0,
                zoom: 2.0,
                rotationSpeed: 0.2
            };
            
            // Fragment shader for the 3D fractal (Mandelbulb)
            const fragmentShader = `
                uniform vec2 resolution;
                uniform float time;
                uniform vec3 cameraPos;
                uniform vec3 cameraLookAt;
                uniform vec3 cameraUp;
                uniform float power;
                uniform int iterations;
                uniform float bailout;
                uniform float colorScale;
                uniform float colorCycles;
                uniform float colorOffset;
                
                // Ray marching parameters
                const int MAX_STEPS = 100;
                const float MAX_DIST = 20.0;
                const float EPSILON = 0.0001;
                
                // Spherical fold for the fractal
                vec3 sphericalFold(vec3 z, float r) {
                    float r2 = dot(z, z);
                    if(r2 < r) {
                        float temp = r*r/r2;
                        z *= temp;
                    } else if(r2 < 1.0) {
                        float temp = 1.0/r2;
                        z *= temp;
                    }
                    return z;
                }
                
                // Mandelbulb distance estimator
                float mandelbulbDE(vec3 pos) {
                    vec3 z = pos;
                    float dr = 1.0;
                    float r = 0.0;
                    float bailoutSquared = bailout * bailout;
                    
                    for (int i = 0; i < 16; i++) {
                        if(i >= iterations) break;
                        
                        r = length(z);
                        if (r > bailout) break;
                        
                        // Convert to polar coordinates
                        float theta = acos(z.z / r);
                        float phi = atan(z.y, z.x);
                        dr = pow(r, power - 1.0) * power * dr + 1.0;
                        
                        // Scale and rotate the point
                        float zr = pow(r, power);
                        theta = theta * power;
                        phi = phi * power;
                        
                        // Convert back to cartesian coordinates
                        z = zr * vec3(
                            sin(theta) * cos(phi),
                            sin(theta) * sin(phi),
                            cos(theta)
                        );
                        
                        // Add the original position
                        z += pos;
                    }
                    
                    return 0.5 * log(r) * r / dr;
                }
                
                // Scene distance function
                float sceneSDF(vec3 p) {
                    return mandelbulbDE(p);
                }
                
                // Ray marching
                float rayMarch(vec3 ro, vec3 rd) {
                    float t = 0.0;
                    for(int i = 0; i < MAX_STEPS; i++) {
                        vec3 p = ro + rd * t;
                        float d = sceneSDF(p);
                        t += d * 0.5; // Slower step for more detail
                        
                        if(d < EPSILON || t > MAX_DIST) break;
                    }
                    return t;
                }
                
                // Normal calculation
                vec3 getNormal(vec3 p) {
                    float d = sceneSDF(p);
                    vec2 e = vec2(EPSILON, 0.0);
                    vec3 n = d - vec3(
                        sceneSDF(p - e.xyy),
                        sceneSDF(p - e.yxy),
                        sceneSDF(p - e.yyx)
                    );
                    return normalize(n);
                }
                
                // Color calculation based on position and normal
                vec3 getColor(vec3 p, vec3 n) {
                    // Distance iteration color
                    float r = length(p);
                    float factor = r * colorScale;
                    
                    // Sine wave coloring with offsets
                    vec3 col = 0.5 + 0.5 * cos(2.0 * 3.14159 * (colorCycles * factor + colorOffset + vec3(0.0, 0.33, 0.67)));
                    
                    // Lighting
                    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                    float diff = max(dot(n, lightDir), 0.1);
                    col *= diff;
                    
                    // Ambient occlusion approximation
                    col *= 0.8 + 0.2 * r;
                    
                    return col;
                }
                
                // Create camera matrices
                mat3 getCameraMatrix(vec3 cameraPos, vec3 lookAt, vec3 up) {
                    vec3 f = normalize(lookAt - cameraPos);
                    vec3 s = normalize(cross(f, up));
                    vec3 u = cross(s, f);
                    return mat3(s, u, -f);
                }
                
                void main() {
                    // Normalized pixel coordinates
                    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
                    
                    // Camera setup
                    vec3 ro = cameraPos;
                    mat3 camMat = getCameraMatrix(cameraPos, cameraLookAt, cameraUp);
                    vec3 rd = camMat * normalize(vec3(uv, -1.0));
                    
                    // Ray march
                    float t = rayMarch(ro, rd);
                    
                    // Coloring
                    vec3 col = vec3(0.0);
                    if(t < MAX_DIST) {
                        vec3 p = ro + t * rd;
                        vec3 n = getNormal(p);
                        col = getColor(p, n);
                        
                        // Fog effect
                        col = mix(col, vec3(0.0), 1.0 - exp(-0.01 * t * t));
                    }
                    
                    // Tonemapping
                    col = col / (1.0 + col);
                    
                    // Gamma correction
                    col = pow(col, vec3(0.4545));
                    
                    gl_FragColor = vec4(col, 1.0);
                }
            `;
            
            // Vertex shader (just passthrough)
            const vertexShader = `
                void main() {
                    gl_Position = vec4(position, 1.0);
                }
            `;
            
            // Create a plane that fills the screen
            const planeGeometry = new THREE.PlaneGeometry(2, 2);
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                    time: { value: 0.0 },
                    cameraPos: { value: new THREE.Vector3(0, 0, params.distance) },
                    cameraLookAt: { value: new THREE.Vector3(0, 0, 0) },
                    cameraUp: { value: new THREE.Vector3(0, 1, 0) },
                    power: { value: params.power },
                    iterations: { value: params.iterations },
                    bailout: { value: params.bailout },
                    colorScale: { value: params.colorScale },
                    colorCycles: { value: params.colorCycles },
                    colorOffset: { value: params.colorOffset }
                },
                fragmentShader: fragmentShader,
                vertexShader: vertexShader
            });
            
            const plane = new THREE.Mesh(planeGeometry, material);
            scene.add(plane);
            
            // GUI for parameter adjustment
            const gui = new dat.GUI();
            gui.add(params, 'power', 1, 16).onChange(val => material.uniforms.power.value = val);
            gui.add(params, 'iterations', 1, 15, 1).onChange(val => material.uniforms.iterations.value = val);
            gui.add(params, 'bailout', 0.5, 10).onChange(val => material.uniforms.bailout.value = val);
            gui.add(params, 'colorScale', 0.1, 2).onChange(val => material.uniforms.colorScale.value = val);
            gui.add(params, 'colorCycles', 0.1, 10).onChange(val => material.uniforms.colorCycles.value = val);
            gui.add(params, 'colorOffset', 0, 2).onChange(val => material.uniforms.colorOffset.value = val);
            gui.add(params, 'rotationSpeed', 0, 1);
            gui.add(params, 'distance', 1, 5).onChange(val => params.distance = val);
            gui.close(); // Start with closed GUI
            
            // Handle window resize
            window.addEventListener('resize', () => {
                // Update camera aspect ratio
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                
                // Update renderer and uniforms
                renderer.setSize(window.innerWidth, window.innerHeight);
                material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
            });
            
            // Mouse interaction for orbit
            document.addEventListener('mousedown', (event) => {
                isDragging = true;
                previousMousePosition = {
                    x: event.clientX,
                    y: event.clientY
                };
            });
            
            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            document.addEventListener('mousemove', (event) => {
                if (!isDragging) return;
                
                const deltaMove = {
                    x: event.clientX - previousMousePosition.x,
                    y: event.clientY - previousMousePosition.y
                };
                
                targetRotationY += deltaMove.x * 0.01;
                targetRotationX += deltaMove.y * 0.01;
                
                // Limit vertical rotation
                targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, targetRotationX));
                
                previousMousePosition = {
                    x: event.clientX,
                    y: event.clientY
                };
            });
            
            // Zoom with mouse wheel
            document.addEventListener('wheel', (event) => {
                params.distance += event.deltaY * 0.001;
                params.distance = Math.max(1.1, Math.min(5, params.distance));
            });
            
            // Keyboard movement
            document.addEventListener('keydown', (event) => {
                if (keyState.hasOwnProperty(event.key)) {
                    keyState[event.key] = true;
                }
            });
            
            document.addEventListener('keyup', (event) => {
                if (keyState.hasOwnProperty(event.key)) {
                    keyState[event.key] = false;
                }
            });
            
            // Animation loop
            const clock = new THREE.Clock();
            let autoRotate = true;
            
            const animate = () => {
                requestAnimationFrame(animate);
                
                const delta = clock.getDelta();
                material.uniforms.time.value += delta;
                
                // Smooth rotation transition
                currentRotationY += (targetRotationY - currentRotationY) * 0.1;
                currentRotationX += (targetRotationX - currentRotationX) * 0.1;
                
                // Add auto-rotation if enabled
                if (autoRotate) {
                    currentRotationY += delta * params.rotationSpeed;
                }
                
                // Process keyboard movement
                const moveSpeed = delta * 1.0;
                const moveVector = new THREE.Vector3(0, 0, 0);
                
                if (keyState.w || keyState.ArrowUp) moveVector.z -= moveSpeed;
                if (keyState.s || keyState.ArrowDown) moveVector.z += moveSpeed;
                if (keyState.a || keyState.ArrowLeft) moveVector.x -= moveSpeed;
                if (keyState.d || keyState.ArrowRight) moveVector.x += moveSpeed;
                if (keyState.q) moveVector.y += moveSpeed;
                if (keyState.e) moveVector.y -= moveSpeed;
                
                // Create rotation matrix
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeRotationY(currentRotationY);
                rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(currentRotationX));
                
                // Apply rotation to move vector
                moveVector.applyMatrix4(rotationMatrix);
                
                // Update camera position in shader
                const cameraTarget = new THREE.Vector3(0, 0, 0);
                const cameraPosition = new THREE.Vector3(0, 0, params.distance);
                
                // Apply rotation to camera position
                cameraPosition.applyMatrix4(rotationMatrix);
                
                // Update uniforms
                material.uniforms.cameraPos.value.copy(cameraPosition);
                material.uniforms.cameraLookAt.value.copy(cameraTarget);
                
                // Render the scene
                renderer.render(scene, camera);
            };
            
            // Start animation
            animate();
        };

        // Initialize 3D Fractal background when DOM is loaded
        document.addEventListener('DOMContentLoaded', init3DFractalBackground);