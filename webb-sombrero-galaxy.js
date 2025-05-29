const initWebbSombreroBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    
    // Create scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    // Set renderer size and pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Set deep space background color
    renderer.setClearColor(0x000205, 1);
    
    // Create textures for the galaxy
    const galaxyTextures = createGalaxyTextures();
    
    // Create the Sombrero Galaxy
    const sombreroGalaxy = createSombreroGalaxy(galaxyTextures);
    scene.add(sombreroGalaxy);
    
    // Create distant stars
    const stars = createStars();
    scene.add(stars);
    
    // Create background dust and distant galaxies
    const backgroundDust = createBackgroundDust();
    scene.add(backgroundDust);
    
    // Create Webb-style diffraction spikes for bright stars
    const diffractionStars = createDiffractionStars();
    scene.add(diffractionStars);
    
    // Add subtle nebula clouds in the background
    const nebulaClouds = createNebulaClouds();
    scene.add(nebulaClouds);
    
    // Function to create galaxy textures using canvas
    function createGalaxyTextures() {
        // Core texture
        const coreCanvas = document.createElement('canvas');
        coreCanvas.width = 1024;
        coreCanvas.height = 1024;
        const coreCtx = coreCanvas.getContext('2d');
        
        // Create galaxy core gradient
        const coreGradient = coreCtx.createRadialGradient(
            512, 512, 0,
            512, 512, 512
        );
        
        // Webb's infrared view of the core - bright amber/golden center
        coreGradient.addColorStop(0, 'rgba(255, 225, 150, 1)');
        coreGradient.addColorStop(0.2, 'rgba(230, 180, 80, 0.9)');
        coreGradient.addColorStop(0.5, 'rgba(180, 110, 50, 0.7)');
        coreGradient.addColorStop(0.8, 'rgba(120, 60, 30, 0.4)');
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        coreCtx.fillStyle = coreGradient;
        coreCtx.fillRect(0, 0, 1024, 1024);
        
        // Add some bright spots to the core
        for (let i = 0; i < 60; i++) {
            const x = 512 + (Math.random() - 0.5) * 400;
            const y = 512 + (Math.random() - 0.5) * 400;
            const radius = Math.random() * 10 + 5;
            
            const spotGradient = coreCtx.createRadialGradient(
                x, y, 0,
                x, y, radius
            );
            
            spotGradient.addColorStop(0, 'rgba(255, 255, 220, 0.8)');
            spotGradient.addColorStop(1, 'rgba(255, 200, 120, 0)');
            
            coreCtx.fillStyle = spotGradient;
            coreCtx.beginPath();
            coreCtx.arc(x, y, radius, 0, Math.PI * 2);
            coreCtx.fill();
        }
        
        // Disk texture
        const diskCanvas = document.createElement('canvas');
        diskCanvas.width = 2048;
        diskCanvas.height = 2048;
        const diskCtx = diskCanvas.getContext('2d');
        
        // Background transparency
        diskCtx.fillStyle = 'rgba(0, 0, 0, 0)';
        diskCtx.fillRect(0, 0, 2048, 2048);
        
        // Create dust lane - the characteristic sombrero feature
        const centerX = 1024;
        const centerY = 1024;
        
        // Outer disk
        const diskGradient = diskCtx.createRadialGradient(
            centerX, centerY, 300,
            centerX, centerY, 900
        );
        
        diskGradient.addColorStop(0, 'rgba(120, 80, 40, 0.7)');
        diskGradient.addColorStop(0.4, 'rgba(180, 120, 70, 0.5)');
        diskGradient.addColorStop(0.8, 'rgba(100, 70, 50, 0.3)');
        diskGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        diskCtx.fillStyle = diskGradient;
        diskCtx.beginPath();
        diskCtx.arc(centerX, centerY, 900, 0, Math.PI * 2);
        diskCtx.fill();
        
        // Dark dust lane
        diskCtx.strokeStyle = 'rgba(40, 20, 10, 0.9)';
        diskCtx.lineWidth = 80;
        diskCtx.beginPath();
        diskCtx.ellipse(centerX, centerY, 600, 200, 0, 0, Math.PI * 2);
        diskCtx.stroke();
        
        // Add some structure to the dust lane
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 600 + (Math.random() - 0.5) * 80;
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance * 0.33; // Elliptical shape
            
            const radius = Math.random() * 30 + 10;
            const opacity = Math.random() * 0.3 + 0.1;
            
            diskCtx.fillStyle = `rgba(30, 20, 15, ${opacity})`;
            diskCtx.beginPath();
            diskCtx.arc(x, y, radius, 0, Math.PI * 2);
            diskCtx.fill();
        }
        
        // Add star clusters and bright spots
        for (let i = 0; i < 300; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 900;
            
            // More stars along the disk
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance * (0.33 + Math.random() * 0.2);
            
            const radius = Math.random() * 4 + 1;
            let brightness = Math.random();
            
            // Cluster more stars in certain regions
            if (distance > 500 && distance < 700) {
                brightness = Math.random() * 0.5 + 0.5;
            }
            
            // Create colors typical of Webb's infrared view
            let r = 200 + brightness * 55;
            let g = 150 + brightness * 105;
            let b = 100 + brightness * 100;
            
            // Some blue for hotter stars
            if (Math.random() < 0.2) {
                r = 100 + brightness * 50;
                g = 150 + brightness * 50;
                b = 200 + brightness * 55;
            }
            
            diskCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness * 0.8})`;
            diskCtx.beginPath();
            diskCtx.arc(x, y, radius, 0, Math.PI * 2);
            diskCtx.fill();
            
            // Add glow for brighter stars
            if (brightness > 0.7) {
                const glowRadius = radius * 3;
                const glow = diskCtx.createRadialGradient(
                    x, y, 0,
                    x, y, glowRadius
                );
                
                glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
                glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                diskCtx.fillStyle = glow;
                diskCtx.beginPath();
                diskCtx.arc(x, y, glowRadius, 0, Math.PI * 2);
                diskCtx.fill();
            }
        }
        
        // Create textures from canvases
        const coreTexture = new THREE.CanvasTexture(coreCanvas);
        const diskTexture = new THREE.CanvasTexture(diskCanvas);
        
        return { core: coreTexture, disk: diskTexture };
    }
    
    // Create the Sombrero Galaxy
    function createSombreroGalaxy(textures) {
        const galaxy = new THREE.Group();
        
        // Galaxy core - bright central bulge
        const coreGeometry = new THREE.PlaneGeometry(20, 20);
        const coreMaterial = new THREE.MeshBasicMaterial({
            map: textures.core,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        galaxy.add(core);
        
        // Galaxy disk - tilted to show the characteristic sombrero shape
        const diskGeometry = new THREE.PlaneGeometry(40, 40);
        const diskMaterial = new THREE.MeshBasicMaterial({
            map: textures.disk,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        const disk = new THREE.Mesh(diskGeometry, diskMaterial);
        disk.rotation.x = Math.PI * 0.2; // Tilt to show sombrero shape
        galaxy.add(disk);
        
        // Position the galaxy
        galaxy.position.z = -30;
        
        return galaxy;
    }
    
    // Create distant stars
    function createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 2000;
        
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);
        
        for (let i = 0; i < starsCount; i++) {
            // Star positions in a large sphere around the scene
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = 50 + Math.random() * 450;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Star colors based on Webb's infrared palette
            const starType = Math.random();
            if (starType < 0.6) {
                // Reddish/amber stars (most common in infrared)
                colors[i * 3] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.6 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.4 + Math.random() * 0.2;
            } else if (starType < 0.9) {
                // Blue/white stars
                colors[i * 3] = 0.7 + Math.random() * 0.3;
                colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
                colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
            } else {
                // A few very bright stars
                colors[i * 3] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
            }
            
            // Star sizes - mostly small with a few larger ones
            sizes[i] = Math.random() < 0.9 ? Math.random() * 1.5 + 0.5 : Math.random() * 3 + 1.5;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const starsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uPixelRatio;
                
                attribute vec3 color;
                attribute float size;
                
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    
                    // Subtle twinkling effect
                    float twinkle = sin(uTime * 2.0 + position.x * 10.0) * 0.2 + 0.8;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * uPixelRatio * twinkle;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Circular star shape with soft edge
                    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
                    if (distanceToCenter > 0.5) discard;
                    
                    // Soft glow effect
                    float glow = 0.5 - distanceToCenter;
                    vec3 finalColor = vColor * glow * 2.0;
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true,
            transparent: true
        });
        
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        return stars;
    }
    
    // Create Webb-style diffraction spikes for bright stars
    function createDiffractionStars() {
        const group = new THREE.Group();
        
        // Create about 20 bright stars with diffraction spikes
        for (let i = 0; i < 20; i++) {
            // Random position, avoiding the center where the galaxy is
            let x, y, z;
            do {
                x = (Math.random() - 0.5) * 100;
                y = (Math.random() - 0.5) * 100;
                z = -40 - Math.random() * 60;
            } while (Math.abs(x) < 20 && Math.abs(y) < 20);
            
            // Star color - mostly warm colors for Webb infrared palette
            const color = new THREE.Color();
            const colorType = Math.random();
            
            if (colorType < 0.6) {
                // Golden/amber stars
                color.setRGB(1.0, 0.8 + Math.random() * 0.2, 0.5 + Math.random() * 0.3);
            } else if (colorType < 0.9) {
                // Blue/white stars
                color.setRGB(0.8 + Math.random() * 0.2, 0.9, 1.0);
            } else {
                // Pure white stars
                color.setRGB(1.0, 1.0, 1.0);
            }
            
            // Create the central star glow
            const glowGeometry = new THREE.PlaneGeometry(3 + Math.random() * 3, 3 + Math.random() * 3);
            const glowTexture = createStarGlowTexture(color);
            
            const glowMaterial = new THREE.MeshBasicMaterial({
                map: glowTexture,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                color: color
            });
            
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.set(x, y, z);
            glow.lookAt(camera.position);
            group.add(glow);
            
            // Create characteristic Webb diffraction spikes
            createDiffractionSpikes(x, y, z, color, group);
        }
        
        return group;
    }
    
    // Create texture for star glow
    function createStarGlowTexture(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient for the glow
        const gradient = ctx.createRadialGradient(
            64, 64, 0,
            64, 64, 64
        );
        
        // Convert color to CSS string
        const r = Math.floor(color.r * 255);
        const g = Math.floor(color.g * 255);
        const b = Math.floor(color.b * 255);
        const colorStr = `rgb(${r}, ${g}, ${b})`;
        
        gradient.addColorStop(0, colorStr);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        return new THREE.CanvasTexture(canvas);
    }
    
    // Create diffraction spikes for a star
    function createDiffractionSpikes(x, y, z, color, group) {
        // Webb telescope has characteristic 6-pointed diffraction spikes
        const spikeCount = 6;
        const spikeLength = 10 + Math.random() * 15;
        
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            
            // Create line geometry for the spike
            const points = [];
            points.push(new THREE.Vector3(0, 0, 0));
            points.push(new THREE.Vector3(
                Math.cos(angle) * spikeLength,
                Math.sin(angle) * spikeLength,
                0
            ));
            
            const spikeGeometry = new THREE.BufferGeometry().setFromPoints(points);
            
            // Create gradient material for the spike
            const spikeMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
                    uTime: { value: 0 }
                },
                vertexShader: `
                    varying float vPosition;
                    
                    void main() {
                        vPosition = position.x * position.x + position.y * position.y;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 uColor;
                    uniform float uTime;
                    
                    varying float vPosition;
                    
                    void main() {
                        // Gradient along the spike
                        float alpha = max(0.0, 1.0 - sqrt(vPosition) / 10.0);
                        
                        // Pulsing effect
                        float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
                        
                        gl_FragColor = vec4(uColor, alpha * pulse);
                    }
                `,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            
            const spike = new THREE.Line(spikeGeometry, spikeMaterial);
            
            // Position at the star location
            spike.position.set(x, y, z);
            
            // Make spikes face the camera
            spike.lookAt(camera.position);
            
            group.add(spike);
        }
    }
    
    // Create background dust and distant galaxies
    function createBackgroundDust() {
        const dustGeometry = new THREE.BufferGeometry();
        const dustCount = 1000;
        
        const positions = new Float32Array(dustCount * 3);
        const colors = new Float32Array(dustCount * 3);
        const sizes = new Float32Array(dustCount);
        
        for (let i = 0; i < dustCount; i++) {
            // Position dust particles throughout the scene
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 2] = -100 - Math.random() * 400;
            
            // Webb infrared color palette for dust - mostly reddish/amber
            colors[i * 3] = 0.6 + Math.random() * 0.4;     // R
            colors[i * 3 + 1] = 0.3 + Math.random() * 0.4; // G
            colors[i * 3 + 2] = 0.2 + Math.random() * 0.3; // B
            
            // Larger particles for dust clouds
            sizes[i] = Math.random() * 4 + 2;
        }
        
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        dustGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const dustMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uPixelRatio;
                
                attribute vec3 color;
                attribute float size;
                
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    
                    // Very subtle movement
                    vec3 pos = position;
                    pos.x += sin(uTime * 0.05 + position.z * 0.01) * 1.0;
                    pos.y += cos(uTime * 0.05 + position.x * 0.01) * 1.0;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * uPixelRatio;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // Soft circular shape for dust
                    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
                    if (distanceToCenter > 0.5) discard;
                    
                    // Softer edge for dust
                    float alpha = 0.5 * (0.5 - distanceToCenter);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
        
        return new THREE.Points(dustGeometry, dustMaterial);
    }
    
    // Create ambient nebula clouds
    function createNebulaClouds() {
        const group = new THREE.Group();
        
        // Create several nebula cloud patches
        for (let i = 0; i < 5; i++) {
            const cloudTexture = createNebulaTexture();
            
            const size = 50 + Math.random() * 100;
            const cloudGeometry = new THREE.PlaneGeometry(size, size);
            const cloudMaterial = new THREE.MeshBasicMaterial({
                map: cloudTexture,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                opacity: 0.2 + Math.random() * 0.1
            });
            
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            
            // Position clouds in the background
            cloud.position.set(
                (Math.random() - 0.5) * 200,
                (Math.random() - 0.5) * 200,
                -200 - Math.random() * 300
            );
            
            // Random rotation
            cloud.rotation.z = Math.random() * Math.PI * 2;
            
            group.add(cloud);
        }
        
        return group;
    }
    
    // Create nebula texture
    function createNebulaTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fill with transparency
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 512, 512);
        
        // Create perlin-like noise for nebula texture
        const noiseScale = 0.01 + Math.random() * 0.02;
        
        // Choose a color palette for this nebula - using Webb's infrared palette
        const colorChoice = Math.floor(Math.random() * 3);
        let color1, color2;
        
        if (colorChoice === 0) {
            // Reddish/amber nebula
            color1 = 'rgba(180, 100, 40, 0.5)';
            color2 = 'rgba(220, 140, 60, 0.8)';
        } else if (colorChoice === 1) {
            // Bluish nebula
            color1 = 'rgba(60, 100, 160, 0.5)';
            color2 = 'rgba(100, 140, 220, 0.8)';
        } else {
            // Purplish nebula
            color1 = 'rgba(140, 80, 180, 0.5)';
            color2 = 'rgba(180, 100, 220, 0.8)';
        }
        
        // Simple noise implementation for the texture
        for (let y = 0; y < 512; y++) {
            for (let x = 0; x < 512; x++) {
                const noiseX = x * noiseScale;
                const noiseY = y * noiseScale;
                
                // Simple noise approximation (not true Perlin noise)
                let noise = 0;
                for (let i = 1; i < 5; i++) {
                    const nx = Math.sin(noiseX * i + Math.cos(noiseY * 0.6 * i));
                    const ny = Math.cos(noiseY * i + Math.sin(noiseX * 0.6 * i));
                    noise += (nx + ny) * (1 / i);
                }
                
                noise = (noise + 4) / 8; // Normalize to 0-1 range approximately
                
                // Only draw if noise is above threshold (creates patchy look)
                if (noise > 0.5) {
                    const alpha = (noise - 0.5) * 2; // Normalize to 0-1 range
                    
                    ctx.fillStyle = noise > 0.7 ? color2 : color1;
                    ctx.globalAlpha = alpha * 0.3;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        
        // Add some brighter spots
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const radius = Math.random() * 30 + 10;
            
            const gradient = ctx.createRadialGradient(
                x, y, 0,
                x, y, radius
            );
            
            gradient.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    // Position camera
    camera.position.z = 40;
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update pixel ratio uniform for stars
        stars.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
        backgroundDust.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    });
    
    // Mouse movement for parallax effect
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    
    document.addEventListener('mousemove', (event) => {
        targetMouseX = (event.clientX / window.innerWidth - 0.5) * 10;
        targetMouseY = (event.clientY / window.innerHeight - 0.5) * 10;
    });
    
    // Animation loop
    const clock = new THREE.Clock();
    let lastTime = 0;
    
    const animate = () => {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();
        const deltaTime = elapsedTime - lastTime;
        lastTime = elapsedTime;
        
        // Smooth mouse movement for parallax
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;
        
        // Update star materials
        stars.material.uniforms.uTime.value = elapsedTime;
        backgroundDust.material.uniforms.uTime.value = elapsedTime;
        
        // Update diffraction spikes
        diffractionStars.children.forEach(child => {
            if (child.material.uniforms && child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = elapsedTime;
            }
            
            // Make diffraction spikes face the camera
            if (child.type === 'Line') {
                child.lookAt(camera.position);
            }
        });
        
        // Subtle rotation of the galaxy
        sombreroGalaxy.rotation.z = Math.sin(elapsedTime * 0.05) * 0.05;
        
        // Camera movement based on mouse for parallax effect
        camera.position.x = mouseX * 0.3;
        camera.position.y = mouseY * 0.3;
        camera.lookAt(0, 0, -30);
        
        // Render the scene
        renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
};

// Initialize Webb Sombrero Background when DOM is loaded
document.addEventListener('DOMContentLoaded', initWebbSombreroBackground);
