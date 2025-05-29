const initMatrixBackground = () => {
    // Get the canvas element
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas to full window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Matrix characters - primarily Japanese katakana characters
    const matrixChars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ¢£¥€§©®™≠≤≥±∂∑∏π√∞∫Ωδ∇①②③④⑤⑥⑦⑧⑨⑩日千万円本大中小一二三四五六七八九十々〇日月火水木金土円了人口手足山川田村口町円子年月日時分秒";
    
    // Font size and column width
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    
    // Array to track the y position of each column
    const drops = [];
    
    // Initialize all columns
    for (let i = 0; i < columns; i++) {
        // Start each column at a random position
        drops[i] = Math.floor(Math.random() * -canvas.height);
    }
    
    // Function to track characters in each position (for changing them)
    const columnChars = [];
    for (let i = 0; i < columns; i++) {
        columnChars[i] = [];
        for (let j = 0; j < canvas.height / fontSize; j++) {
            // Initialize with random characters
            columnChars[i][j] = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
        }
    }
    
    // Character change frequency (probability)
    const charChangeProb = 0.02;
    
    // The matrix animation loop
    function draw() {
        // Set translucent black background to create fade effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set the green color and font
        ctx.fillStyle = '#00FF41'; // The exact Matrix green
        ctx.font = `${fontSize}px monospace`;
        
        // Draw each column
        for (let i = 0; i < drops.length; i++) {
            // Calculate the y position for characters
            let yPos = drops[i] * fontSize;
            
            // Loop through the characters in this column
            for (let j = 0; j < 20; j++) { // Limit to 20 visible characters per column
                const charPos = Math.floor((yPos / fontSize) - j);
                
                // Only draw if in bounds of canvas
                if (charPos >= 0 && charPos < canvas.height / fontSize) {
                    // Occasionally change characters
                    if (Math.random() < charChangeProb) {
                        columnChars[i][charPos] = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
                    }
                    
                    const char = columnChars[i][charPos];
                    
                    // Calculate position to draw
                    const x = i * fontSize;
                    const y = yPos - (j * fontSize);
                    
                    // Set color based on position - first char is white, rest are green
                    if (j === 0) {
                        ctx.fillStyle = "#FFFFFF"; // White for first char
                    } else {
                        // Fade out for trailing characters
                        const opacity = 1 - (j / 20);
                        ctx.fillStyle = `rgba(0, 255, 65, ${opacity})`;
                    }
                    
                    // Draw the character
                    ctx.fillText(char, x, y);
                    
                    // Reset to green for next iteration
                    ctx.fillStyle = '#00FF41';
                }
            }
            
            // Update the column position
            drops[i]++;
            
            // If the column has moved off the bottom of the screen, reset to random position above the screen
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = Math.floor(Math.random() * -10);
            }
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Recalculate number of columns
        const newColumns = Math.floor(canvas.width / fontSize);
        
        // Add new columns if needed
        if (newColumns > columns) {
            for (let i = columns; i < newColumns; i++) {
                drops[i] = Math.floor(Math.random() * -canvas.height);
                columnChars[i] = [];
                for (let j = 0; j < canvas.height / fontSize; j++) {
                    columnChars[i][j] = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
                }
            }
        }
    });
    
    // Run the animation
    setInterval(draw, 33); // ~30 FPS
};

// Initialize Matrix background when DOM is loaded
document.addEventListener('DOMContentLoaded', initMatrixBackground);
