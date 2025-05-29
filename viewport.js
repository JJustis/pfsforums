// scale-viewport.js - JavaScript to handle viewport scaling dynamically

// Main scaling function
function setupViewportScaling() {
  const DESIGN_WIDTH = 1200; // Your design's desktop width
  let scaleViewport = true;  // Toggle to enable/disable scaling
  
  // Function to update the scale factor
  function updateScale() {
    // Only apply scaling if enabled and viewport is narrower than design width
    if (!scaleViewport) return;
    
    const viewportWidth = window.innerWidth;
    
    if (viewportWidth < DESIGN_WIDTH) {
      // Calculate scale ratio
      const scale = viewportWidth / DESIGN_WIDTH;
      
      // Apply transform to body element
      document.body.style.transform = `scale(${scale})`;
      document.body.style.transformOrigin = 'top left';
      document.body.style.width = `${DESIGN_WIDTH}px`;
      
      // Adjust height to prevent cutoff
      const scaledBodyHeight = document.body.scrollHeight * scale;
      document.body.style.height = `${scaledBodyHeight}px`;
      
      // Apply custom data attribute for potential CSS targeting
      document.documentElement.setAttribute('data-scaled', 'true');
      document.documentElement.style.setProperty('--scale-factor', scale);
      
      // Fix for fixed positioned elements (modals, etc)
      const fixedElements = document.querySelectorAll('.modal, .toast-container');
      fixedElements.forEach(el => {
        if (el) {
          el.style.transform = `scale(${1/scale})`;
          el.style.transformOrigin = 'center';
        }
      });
    } else {
      // Reset scaling if viewport is wider than design width
      document.body.style.transform = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.removeAttribute('data-scaled');
      document.documentElement.style.removeProperty('--scale-factor');
      
      // Reset fixed elements
      const fixedElements = document.querySelectorAll('.modal, .toast-container');
      fixedElements.forEach(el => {
        if (el) {
          el.style.transform = '';
        }
      });
    }
  }
  
  // Fix for iOS and mobile browsers - additional handling
  function handleMobileSpecifics() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Force minimum width on mobile
      document.body.style.minWidth = `${DESIGN_WIDTH}px`;
      
      // Apply additional mobile-specific fixes
      document.body.classList.add('viewport-scaled-mobile');
      
      // Handle orientation changes
      window.addEventListener('orientationchange', function() {
        // Short delay to allow orientation to complete
        setTimeout(updateScale, 300);
      });
      
      // Prevent user scaling/zooming for consistent experience
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      } else {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
      }
    }
  }
  
  // Function to toggle scaling on/off
  function toggleScaling(enable) {
    scaleViewport = enable;
    if (enable) {
      updateScale();
    } else {
      // Reset all scaling
      document.body.style.transform = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.removeAttribute('data-scaled');
    }
    
    // Store preference
    localStorage.setItem('viewport-scaling-enabled', enable ? 'true' : 'false');
  }
  
  // Check stored preference
  const storedPreference = localStorage.getItem('viewport-scaling-enabled');
  if (storedPreference !== null) {
    scaleViewport = storedPreference === 'true';
  }
  
  // Initialize
  handleMobileSpecifics();
  updateScale();
  
  // Add toggle UI to page if you want to let users switch modes
  function addScalingToggle() {
    const toggle = document.createElement('div');
    toggle.className = 'scaling-toggle';
    toggle.innerHTML = `
      <label>
        <input type="checkbox" ${scaleViewport ? 'checked' : ''}>
        Enable viewport scaling
      </label>
    `;
    toggle.style.position = 'fixed';
    toggle.style.bottom = '10px';
    toggle.style.left = '10px';
    toggle.style.background = 'rgba(0,0,0,0.7)';
    toggle.style.color = 'white';
    toggle.style.padding = '5px 10px';
    toggle.style.borderRadius = '5px';
    toggle.style.zIndex = '9999';
    
    const checkbox = toggle.querySelector('input');
    checkbox.addEventListener('change', function() {
      toggleScaling(this.checked);
    });
    
    document.body.appendChild(toggle);
  }
  
  // Uncomment to add toggle control
  // addScalingToggle();
  
  // Set up event listeners
  window.addEventListener('resize', updateScale);
  window.addEventListener('load', updateScale);
  
  // Return control methods for external use
  return {
    update: updateScale,
    toggle: toggleScaling,
    addToggleUI: addScalingToggle
  };
}

// Initialize scaling when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize and store the controller in case we need it later
  window.viewportScaler = setupViewportScaling();
  
  // Optionally, expose methods globally
  window.toggleViewportScaling = function(enable) {
    if (window.viewportScaler) {
      window.viewportScaler.toggle(enable);
    }
  };
});