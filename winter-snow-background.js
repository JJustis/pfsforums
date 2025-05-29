const initWinterSnowBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Snow settings
    const snowflakeCount = 1500; // Blizzard amount
    const snowflakes = [];
    const windStrength = 2; // Base wind strength
    let windAngle = 0; // Current wind angle
    let windChangeTimer = 0; // Timer for changing wind
    
    // Snow accumulation
    const groundResolution = 5; // Pixels between ground height measurements
    const groundPoints = Math.ceil(canvas.width / groundResolution);
    const snowGround = new Array(groundPoints).fill(0); // Height of snow at each x point
    
    // Create initial snowflakes
    for (let i = 0; i < snowflakeCount; i++) {
        createSnowflake(snowflakes, true);
    }
    
    // Function to create a new snowflake
    function createSnowflake(array, randomizeY = false) {
        const flake = {
            x: Math.random() * canvas.width,
            y: randomizeY ? Math.random() * canvas.height * 2 - canvas.height : -10 - Math.random() * 20,
            size: Math.random() * 4 + 1,
            speedX: 0,
            speedY: Math.random() * 1 + 1,
            opacity: Math.random() * 0.7 + 0.3,
            wiggle: Math.random() * 3, // How much it wiggles falling
            wiggleSpeed: Math.random() * 0.02, // Speed of wiggle
            wiggleOffset: Math.random() * Math.PI * 2, // Starting wiggle position
            rotating: Math.random() < 0.3, // Some snowflakes rotate
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            rotationAngle: Math.random() * Math.PI * 2,
            shape: Math.floor(Math.random() * 3) // Different snowflake shapes
        };
        array.push(flake);
    }
    
    // Function to draw a snowflake
    function drawSnowflake(flake) {
        ctx.save();
        ctx.translate(flake.x, flake.y);
        
        if (flake.rotating) {
            ctx.rotate(flake.rotationAngle);
        }
        
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        
        // Different snowflake shapes
        switch (flake.shape) {
            case 0: // Circle
                ctx.arc(0, 0, flake.size, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 1: // Simple star/crystal
                drawSnowCrystal(flake.size);
                break;
            case 2: // Detailed crystal
                drawDetailedCrystal(flake.size);
                break;
        }
        
        ctx.restore();
    }
    
    // Function to draw a snow crystal
    function drawSnowCrystal(size) {
        ctx.beginPath();
        // Draw a simple six-pointed star
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * size * 1.5, Math.sin(angle) * size * 1.5);
        }
        ctx.lineWidth = size / 3;
        ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.stroke();
    }
    
    // Function to draw a more detailed crystal
    function drawDetailedCrystal(size) {
        const armLength = size * 1.8;
        
        // Draw six arms
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            
            // Main arm
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * armLength, Math.sin(angle) * armLength);
            ctx.lineWidth = size / 4;
            ctx.strokeStyle = `rgba(255, 255, 255, 0.9)`;
            ctx.stroke();
            
            // Side branches - two per arm
            const branchLength = armLength * 0.4;
            for (let j = 1; j < 3; j++) {
                const branchStart = armLength * (j / 3);
                
                // Left branch
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * branchStart, Math.sin(angle) * branchStart);
                ctx.lineTo(
                    Math.cos(angle) * branchStart + Math.cos(angle + Math.PI/3) * branchLength,
                    Math.sin(angle) * branchStart + Math.sin(angle + Math.PI/3) * branchLength
                );
                ctx.lineWidth = size / 5;
                ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
                ctx.stroke();
                
                // Right branch
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * branchStart, Math.sin(angle) * branchStart);
                ctx.lineTo(
                    Math.cos(angle) * branchStart + Math.cos(angle - Math.PI/3) * branchLength,
                    Math.sin(angle) * branchStart + Math.sin(angle - Math.PI/3) * branchLength
                );
                ctx.lineWidth = size / 5;
                ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
                ctx.stroke();
            }
        }
        
        // Center dot
        ctx.beginPath();
        ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
        ctx.fill();
    }
    
    // Function to draw accumulated snow on the ground
    function drawSnowGround() {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        
        // Draw the snow surface as a connected line
        for (let i = 0; i < snowGround.length; i++) {
            const x = i * groundResolution;
            const y = canvas.height - snowGround[i];
            ctx.lineTo(x, y);
        }
        
        // Close the shape
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        
        // Create a gradient for the snow
        const gradient = ctx.createLinearGradient(0, canvas.height - 100, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(240, 250, 255, 1)');
        gradient.addColorStop(1, 'rgba(220, 240, 255, 0.9)');
        
        // Fill with gradient
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add some texture to the snow surface
        for (let i = 0; i < snowGround.length; i++) {
            if (Math.random() < 0.05 && snowGround[i] > 10) {
                const x = i * groundResolution;
                const y = canvas.height - snowGround[i];
                
                // Draw small sparkle
                ctx.beginPath();
                ctx.arc(x, y - Math.random() * 8, Math.random() * 2 + 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`;
                ctx.fill();
            }
        }
        
        // Add some random snow pile details
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * canvas.width;
            const groundIndex = Math.floor(x / groundResolution);
            
            if (groundIndex >= 0 && groundIndex < snowGround.length && snowGround[groundIndex] > 5) {
                const y = canvas.height - snowGround[groundIndex] + (Math.random() * 10 - 8);
                
                ctx.beginPath();
                ctx.arc(x, y, Math.random() * 3 + 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.3})`;
                ctx.fill();
            }
        }
    }
    
    // Function to update wind
    function updateWind(deltaTime) {
        windChangeTimer += deltaTime;
        
        // Change wind direction and strength periodically
        if (windChangeTimer > 2) { // Every 2 seconds
            windChangeTimer = 0;
            
            // Gradual shift in wind angle
            windAngle += (Math.random() - 0.5) * Math.PI / 4;
            
            // Random gusts
            if (Math.random() < 0.2) {
                // Strong gust
                windStrength = Math.random() * 4 + 3;
            } else {
                // Normal wind
                windStrength = Math.random() * 2 + 1;
            }
        }
    }
    
    // Function to update a snowflake
    function updateSnowflake(flake, deltaTime, windX) {
        // Apply wind force gradually to create inertia effect
        flake.speedX = flake.speedX * 0.98 + windX * 0.02 * (flake.size < 2 ? 2 : 1);
        
        // Add some wiggle to the fall
        const wiggleX = Math.sin(Date.now() * flake.wiggleSpeed + flake.wiggleOffset) * flake.wiggle;
        
        // Update position
        flake.x += flake.speedX + wiggleX * deltaTime;
        flake.y += flake.speedY * deltaTime * 60;
        
        // Update rotation if this flake rotates
        if (flake.rotating) {
            flake.rotationAngle += flake.rotationSpeed * deltaTime * 60;
        }
        
        // If snowflake goes off screen horizontally, wrap around
        if (flake.x < -20) flake.x = canvas.width + 20;
        else if (flake.x > canvas.width + 20) flake.x = -20;
        
        // Check if snowflake has hit the ground
        const groundIndex = Math.floor(flake.x / groundResolution);
        if (groundIndex >= 0 && groundIndex < snowGround.length) {
            const groundHeight = snowGround[groundIndex];
            
            if (flake.y > canvas.height - groundHeight - (flake.size / 2)) {
                // Add to snow pile based on size
                const snowAddAmount = flake.size * 0.15;
                
                // Create spreading effect - add snow in an area around impact
                const spreadRadius = Math.floor(flake.size * 2);
                for (let i = -spreadRadius; i <= spreadRadius; i++) {
                    const spreadIndex = groundIndex + i;
                    if (spreadIndex >= 0 && spreadIndex < snowGround.length) {
                        const falloff = 1 - Math.abs(i) / (spreadRadius + 1); // Reduce effect further from center
                        snowGround[spreadIndex] += snowAddAmount * falloff;
                    }
                }
                
                // Remove this snowflake and create a new one
                const index = snowflakes.indexOf(flake);
                if (index > -1) {
                    snowflakes.splice(index, 1);
                    createSnowflake(snowflakes);
                }
                
                // Limit maximum snow height
                const maxSnowHeight = canvas.height * 0.4; // 40% of screen height max
                for (let i = 0; i < snowGround.length; i++) {
                    if (snowGround[i] > maxSnowHeight) {
                        snowGround[i] = maxSnowHeight;
                    }
                }
            }
        }
    }
    
    // Animation variables
    let lastTime = 0;
    
    // The animation loop
    function animate(currentTime) {
        requestAnimationFrame(animate);
        
        // Calculate delta time for smooth animation
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Skip if delta time is too large (tab was inactive)
        if (deltaTime > 0.1) return;
        
        // Clear canvas with a very dark blue background
        ctx.fillStyle = 'rgba(5, 15, 35, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update wind
        updateWind(deltaTime);
        
        // Calculate wind force based on angle and strength
        const windX = Math.cos(windAngle) * windStrength;
        
        // Blur effect for the background (simulating a blizzard view)
        ctx.fillStyle = 'rgba(20, 30, 50, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw distant snow (blurred background effect)
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 200; i++) {
            const x = (Math.random() * canvas.width);
            const y = (Math.random() * canvas.height);
            const size = Math.random() * 2 + 0.5;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200, 210, 255, 0.3)';
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Update and draw snowflakes
        for (let i = snowflakes.length - 1; i >= 0; i--) {
            updateSnowflake(snowflakes[i], deltaTime, windX);
            drawSnowflake(snowflakes[i]);
        }
        
        // Smooth out the snow ground
        for (let i = 1; i < snowGround.length - 1; i++) {
            snowGround[i] = (snowGround[i-1] + snowGround[i] * 2 + snowGround[i+1]) / 4;
        }
        
        // Draw the accumulated snow
        drawSnowGround();
        
        // Add occasional new snowflakes to maintain the blizzard
        if (snowflakes.length < snowflakeCount && Math.random() < 0.1) {
            createSnowflake(snowflakes);
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Save the current snow ground profile
        const oldWidth = canvas.width;
        const oldGroundPoints = snowGround.length;
        const oldGroundHeights = [...snowGround];
        
        // Update canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Recalculate ground points based on new width
        const newGroundPoints = Math.ceil(canvas.width / groundResolution);
        
        // Create new snow ground array with proper scaling
        const newSnowGround = new Array(newGroundPoints).fill(0);
        for (let i = 0; i < newGroundPoints; i++) {
            const oldIndex = Math.floor(i * oldWidth / canvas.width);
            if (oldIndex >= 0 && oldIndex < oldGroundPoints) {
                newSnowGround[i] = oldGroundHeights[oldIndex];
            }
        }
        
        // Replace the snow ground
        while (snowGround.length) snowGround.pop();
        newSnowGround.forEach(height => snowGround.push(height));
    });
    
    // Track mouse movement for subtle wind influence
    let mouseX = 0;
    document.addEventListener('mousemove', (event) => {
        const newMouseX = event.clientX;
        // Influence wind slightly by mouse movement
        if (Math.abs(newMouseX - mouseX) > 5) {
            windAngle += (newMouseX - mouseX) * 0.0002;
            mouseX = newMouseX;
        }
    });
    
    // Start the animation
    animate(0);
};

// Initialize Winter Snow background when DOM is loaded
document.addEventListener('DOMContentLoaded', initWinterSnowBackground);
