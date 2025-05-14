// Theme Toggle Functionality
document.addEventListener('DOMContentLoaded', () => {
    // Create and append the theme toggle button to the navigation
    const createThemeToggle = () => {
        // Find the navigation bar
        const nav = document.querySelector('nav');
        if (!nav) return;
        
        // Create toggle container
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'theme-toggle-container';
        
        // Create icon
        const icon = document.createElement('span');
        icon.className = 'theme-toggle-icon';
        icon.innerHTML = '<i class="fas fa-moon"></i>';
        
        // Create toggle switch
        const label = document.createElement('label');
        label.className = 'theme-toggle';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'theme-toggle-input';
        
        const slider = document.createElement('span');
        slider.className = 'slider';
        
        // Assemble the toggle
        label.appendChild(input);
        label.appendChild(slider);
        toggleContainer.appendChild(icon);
        toggleContainer.appendChild(label);
        
        // Add it to the navigation
        nav.appendChild(toggleContainer);
        
        return input;
    };
    
    // Initialize theme based on localStorage or system preference
    const initializeTheme = () => {
        // Check if user has previously set a theme preference
        const savedTheme = localStorage.getItem('theme');
        
        // Set initial theme based on saved preference or system preference
        if (savedTheme) {
            document.body.setAttribute('data-theme', savedTheme);
            if (savedTheme === 'dark') {
                const toggle = document.getElementById('theme-toggle-input');
                if (toggle) toggle.checked = true;
            }
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            // System preference is dark
            document.body.setAttribute('data-theme', 'dark');
            const toggle = document.getElementById('theme-toggle-input');
            if (toggle) toggle.checked = true;
        }
        
        // Update icon based on current theme
        updateThemeIcon();
    };
    
    // Function to update the icon based on the current theme
    const updateThemeIcon = () => {
        const icon = document.querySelector('.theme-toggle-icon i');
        if (!icon) return;
        
        // Check current theme
        const isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
        
        // Update icon
        if (isDarkTheme) {
            icon.className = 'fas fa-moon';
        } else {
            icon.className = 'fas fa-sun';
        }
    };
    
    // Function to toggle the theme
    const toggleTheme = () => {
        // Get current theme
        const currentTheme = document.body.getAttribute('data-theme') || 'light';
        
        // Toggle theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        // Apply the new theme
        document.body.setAttribute('data-theme', newTheme);
        
        // Save preference to localStorage
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        updateThemeIcon();
    };
    
    // Create the toggle and set up the event listener
    const themeToggle = createThemeToggle();
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
    
    // Initialize theme
    initializeTheme();
});