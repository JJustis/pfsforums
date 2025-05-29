const initMinecraftGingerbreadBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Isometric grid settings
    const tileWidth = 40;
    const tileHeight = 20;
    const gridWidth = 12;
    const gridHeight = 30;
    
    // Position settings - create two isometric areas on the sides
    const leftOffset = 40;
    const rightOffset = canvas.width - 320;
    const topOffset = 100;
    
    // Colors for gingerbread theme
    const colors = {
        gingerbread: '#A05A2C',
        gingerbreadDark: '#804525',
        frosting: '#F0F0F0',
        grass: '#7BB661',
        greenCandy: '#2CC463',
        redCandy: '#D13B40',
        chocolate: '#5C3A21',
        sky: '#ADD8E6',
        pathways: '#E6C073'
    };
    
    // Preload images
    const steveImg = new Image();
    steveImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5QkBDTEyGnEHIAAAAl5JREFUWMPtl01rE1EUhp8zSZMSbJJJ6ofUhQvrTnClgrjRlYJLQfwHutGlC3+GP8GlK8GFH+BCRKigCC5ExIUfNIkVJJlMk5JMZu5xkdrU2NQmmVS6yLN67+G+z33PnLkDK/o/JXVPy7IG+sXE8qb6ZvHRzPQ03TJ1T2u9dKQ8CLBjuzh27CiJRGK5AlcWFxdvCCHsUCjk8/l8ftM0nYYqRgK3bk7Jx/dS62Hg7r2UBD64rgvI04ODgzesVus3gKVlYJNpHkQI+83c3NxYJBLZvzE/+FZIYKCvn3Q6/cLzvPFwOMzY2BhHjoyyfWQEgGw2y8TEBCsV+PT5C69ev+H+g4d4nged3nQ6/TIWi+0LrAqAZVmICOl0GmMMvu/jui6e5+G6Lul0GmMMInLJsqytzWA4jsONW7exbZuJyQlc18X3fUSERqNBPp/HcRxs2+bY+Dju53yTfODT1hbOfT3H0NAQoVCI4eHhprnX6/X6GsDGfwK19jNQQtDd3f3HnM7ViEajKzjCVR4hyQQErbqfgBVoSSoxLzYthbxlLQN8X9n0IzAWbk0L0QqF53uvlgEGAsUG85y2ZSKMCJQsJdXP2sAfiYFMkBK7Bao1P4GRWkCvqdUvVsoFGmrVNW7bUhZ5KWVVUk3dFVrDjqoqVOsewEiAr1QNzxRiNTxqZrcBDKCBnIBTNxUVL+P7vlcbAM0VBWbrbg3fVHO1KrWVA5aU8ktROAGcKNTLmUbDNM36KwXwoRnYCJw2zYVU8OViBKj8tvYTYBdwYK0DWtHvnAXlxGioG8MAAAAASUVORK5CYII=';
    
    // Steve character animation frames
    const steveFrames = [
        {x: 0, y: 0, width: 32, height: 32},
        {x: 32, y: 0, width: 32, height: 32},
        {x: 64, y: 0, width: 32, height: 32},
        {x: 96, y: 0, width: 32, height: 32}
    ];
    
    // Character state
    const leftSteve = {
        x: 3,
        y: 10,
        direction: 1,  // 0: up, 1: right, 2: down, 3: left
        frame: 0,
        frameCounter: 0,
        path: generateRandomPath(3, 10, gridWidth/2 - 2, gridHeight - 2)
    };
    
    const rightSteve = {
        x: 3,
        y: 10,
        direction: 1,
        frame: 0,
        frameCounter: 0,
        path: generateRandomPath(3, 10, gridWidth/2 - 2, gridHeight - 2)
    };
    
    // Generate a random path for Steve to follow
    function generateRandomPath(startX, startY, gridWidth, gridHeight) {
        const path = [];
        let currentX = startX;
        let currentY = startY;
        
        // Generate random path with 20 waypoints
        for (let i = 0; i < 20; i++) {
            // Random direction
            const direction = Math.floor(Math.random() * 4);
            let steps = Math.floor(Math.random() * 3) + 1;
            
            // Move in that direction for steps
            for (let j = 0; j < steps; j++) {
                if (direction === 0 && currentY > 1) currentY--; // Up
                if (direction === 1 && currentX < gridWidth - 1) currentX++; // Right
                if (direction === 2 && currentY < gridHeight - 1) currentY++; // Down
                if (direction === 3 && currentX > 1) currentX--; // Left
                
                path.push({x: currentX, y: currentY, direction: direction});
            }
        }
        
        return path;
    }
    
    // Function to convert isometric coordinates to screen coordinates
    function isoToScreen(x, y, offsetX, offsetY) {
        const screenX = offsetX + (x - y) * tileWidth / 2;
        const screenY = offsetY + (x + y) * tileHeight / 2;
        return {x: screenX, y: screenY};
    }
    
    // Draw a block at isometric coordinates
    function drawBlock(x, y, height, color, offsetX, offsetY) {
        const basePos = isoToScreen(x, y, offsetX, offsetY);
        
        // Draw top face (slightly lighter)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(basePos.x, basePos.y - height * tileHeight);
        ctx.lineTo(basePos.x + tileWidth / 2, basePos.y - height * tileHeight + tileHeight / 2);
        ctx.lineTo(basePos.x, basePos.y - height * tileHeight + tileHeight);
        ctx.lineTo(basePos.x - tileWidth / 2, basePos.y - height * tileHeight + tileHeight / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        // Draw right face (slightly darker)
        const rightShadow = darkenColor(color, 20);
        ctx.fillStyle = rightShadow;
        ctx.beginPath();
        ctx.moveTo(basePos.x, basePos.y - height * tileHeight + tileHeight);
        ctx.lineTo(basePos.x + tileWidth / 2, basePos.y - height * tileHeight + tileHeight / 2);
        ctx.lineTo(basePos.x + tileWidth / 2, basePos.y + tileHeight / 2);
        ctx.lineTo(basePos.x, basePos.y + tileHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw left face (medium darkness)
        const leftShadow = darkenColor(color, 40);
        ctx.fillStyle = leftShadow;
        ctx.beginPath();
        ctx.moveTo(basePos.x, basePos.y - height * tileHeight + tileHeight);
        ctx.lineTo(basePos.x - tileWidth / 2, basePos.y - height * tileHeight + tileHeight / 2);
        ctx.lineTo(basePos.x - tileWidth / 2, basePos.y + tileHeight / 2);
        ctx.lineTo(basePos.x, basePos.y + tileHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    // Draw a flat tile at isometric coordinates
    function drawTile(x, y, color, offsetX, offsetY) {
        const pos = isoToScreen(x, y, offsetX, offsetY);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x + tileWidth / 2, pos.y + tileHeight / 2);
        ctx.lineTo(pos.x, pos.y + tileHeight);
        ctx.lineTo(pos.x - tileWidth / 2, pos.y + tileHeight / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }
    
    // Draw the Steve character
    function drawSteve(steve, offsetX, offsetY) {
        const pos = isoToScreen(steve.x, steve.y, offsetX, offsetY);
        
        // Adjust position to center Steve on the tile
        const drawX = pos.x - 16;
        const drawY = pos.y - 32;
        
        ctx.drawImage(steveImg, drawX, drawY, 32, 32);
    }
    
    // Move Steve along his path
    function moveSteve(steve) {
        steve.frameCounter++;
        
        // Change animation frame every 10 ticks
        if (steve.frameCounter >= 10) {
            steve.frame = (steve.frame + 1) % 4;
            steve.frameCounter = 0;
            
            // Move to next waypoint in path
            if (steve.path.length > 0) {
                const nextWaypoint = steve.path.shift();
                steve.x = nextWaypoint.x;
                steve.y = nextWaypoint.y;
                steve.direction = nextWaypoint.direction;
                
                // Add the waypoint back to the end for continuous movement
                steve.path.push(nextWaypoint);
            }
        }
    }
    
    // Draw a gingerbread house at the specified position
    function drawGingerbreadHouse(baseX, baseY, offsetX, offsetY) {
        // House foundation - 4x4 brown floor
        for (let x = baseX; x < baseX + 4; x++) {
            for (let y = baseY; y < baseY + 4; y++) {
                drawBlock(x, y, 1, colors.chocolate, offsetX, offsetY);
            }
        }
        
        // Walls - gingerbread color
        for (let x = baseX; x < baseX + 4; x++) {
            // Front and back walls
            drawBlock(x, baseY, 2, colors.gingerbread, offsetX, offsetY);
            drawBlock(x, baseY + 3, 2, colors.gingerbread, offsetX, offsetY);
        }
        
        for (let y = baseY + 1; y < baseY + 3; y++) {
            // Left and right walls
            drawBlock(baseX, y, 2, colors.gingerbread, offsetX, offsetY);
            drawBlock(baseX + 3, y, 2, colors.gingerbread, offsetX, offsetY);
        }
        
        // Door
        drawBlock(baseX + 1, baseY, 2, colors.chocolate, offsetX, offsetY);
        
        // Windows
        drawBlock(baseX + 2, baseY, 2, colors.redCandy, offsetX, offsetY);
        drawBlock(baseX, baseY + 1, 2, colors.greenCandy, offsetX, offsetY);
        drawBlock(baseX + 3, baseY + 1, 2, colors.greenCandy, offsetX, offsetY);
        
        // Roof - pointy style
        for (let h = 0; h < 3; h++) {
            for (let x = baseX + h; x < baseX + 4 - h; x++) {
                for (let y = baseY + h; y < baseY + 4 - h; y++) {
                    drawBlock(x, y, 3 + h, h === 2 ? colors.redCandy : colors.frosting, offsetX, offsetY);
                }
            }
        }
        
        // Frosting decorations
        for (let x = baseX; x < baseX + 4; x++) {
            drawBlock(x, baseY, 3, colors.frosting, offsetX, offsetY);
            drawBlock(x, baseY + 3, 3, colors.frosting, offsetX, offsetY);
        }
        
        for (let y = baseY; y < baseY + 4; y++) {
            drawBlock(baseX, y, 3, colors.frosting, offsetX, offsetY);
            drawBlock(baseX + 3, y, 3, colors.frosting, offsetX, offsetY);
        }
        
        // Candy decorations
        drawBlock(baseX, baseY, 4, colors.redCandy, offsetX, offsetY);
        drawBlock(baseX + 3, baseY, 4, colors.greenCandy, offsetX, offsetY);
        drawBlock(baseX, baseY + 3, 4, colors.greenCandy, offsetX, offsetY);
        drawBlock(baseX + 3, baseY + 3, 4, colors.redCandy, offsetX, offsetY);
    }
    
    // Utility function to darken a color
    function darkenColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }
    
    // Create the isometric world
    function createWorld() {
        // Left side world
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                // Ground layer
                if ((x + y) % 2 === 0) {
                    drawTile(x, y, colors.grass, leftOffset, topOffset);
                } else {
                    drawTile(x, y, darkenColor(colors.grass, 10), leftOffset, topOffset);
                }
                
                // Pathways
                if ((x === 3 || x === 4) && y >= 5 && y <= gridHeight - 5) {
                    drawTile(x, y, colors.pathways, leftOffset, topOffset);
                }
            }
        }
        
        // Add gingerbread houses on left side
        drawGingerbreadHouse(1, 5, leftOffset, topOffset);
        drawGingerbreadHouse(6, 12, leftOffset, topOffset);
        drawGingerbreadHouse(2, 20, leftOffset, topOffset);
        
        // Candy cane fence
        for (let y = 2; y < gridHeight - 2; y += 2) {
            if (y % 4 === 0) {
                drawBlock(0, y, 1, colors.redCandy, leftOffset, topOffset);
            } else {
                drawBlock(0, y, 1, colors.frosting, leftOffset, topOffset);
            }
        }
        
        for (let x = 0; x < gridWidth; x += 2) {
            if (x % 4 === 0) {
                drawBlock(x, 0, 1, colors.redCandy, leftOffset, topOffset);
            } else {
                drawBlock(x, 0, 1, colors.frosting, leftOffset, topOffset);
            }
        }
        
        // Right side world
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                // Ground layer with different pattern
                if ((x + y) % 2 === 1) {
                    drawTile(x, y, colors.grass, rightOffset, topOffset);
                } else {
                    drawTile(x, y, darkenColor(colors.grass, 10), rightOffset, topOffset);
                }
                
                // Pathways
                if ((x === 6 || x === 7) && y >= 5 && y <= gridHeight - 5) {
                    drawTile(x, y, colors.pathways, rightOffset, topOffset);
                }
            }
        }
        
        // Add gingerbread houses on right side
        drawGingerbreadHouse(5, 7, rightOffset, topOffset);
        drawGingerbreadHouse(1, 14, rightOffset, topOffset);
        drawGingerbreadHouse(6, 21, rightOffset, topOffset);
        
        // Candy cane decorations
        for (let y = 4; y < gridHeight - 4; y += 4) {
            drawBlock(gridWidth - 1, y, 2, colors.redCandy, rightOffset, topOffset);
            drawBlock(gridWidth - 1, y + 1, 2, colors.frosting, rightOffset, topOffset);
        }
    }
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Clear the canvas
        ctx.fillStyle = colors.sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw border to show the middle content area
        const contentWidth = canvas.width - leftOffset - (canvas.width - rightOffset);
        ctx.fillStyle = 'rgba(240, 240, 240, 0.7)';
        ctx.fillRect(leftOffset + gridWidth * tileWidth / 2, 0, contentWidth, canvas.height);
        
        // Redraw the isometric world
        createWorld();
        
        // Move and draw Steve
        moveSteve(leftSteve);
        moveSteve(rightSteve);
        drawSteve(leftSteve, leftOffset, topOffset);
        drawSteve(rightSteve, rightOffset, topOffset);
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Recalculate right offset based on new width
        rightOffset = canvas.width - 320;
    });
    
    // Start the animation
    steveImg.onload = function() {
        animate();
    };
};

// Initialize Minecraft Gingerbread Background when DOM is loaded
document.addEventListener('DOMContentLoaded', initMinecraftGingerbreadBackground);
