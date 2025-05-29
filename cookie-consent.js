// Cookie Consent Handler
document.addEventListener('DOMContentLoaded', () => {
    const cookieConsent = document.getElementById('cookie-consent');
    const acceptBtn = document.getElementById('accept-cookies');
    const declineBtn = document.getElementById('decline-cookies');
    
    // Check if user has already made a choice
    const cookieChoice = localStorage.getItem('cookie_consent');
    
    if (cookieChoice === null) {
        // Show the consent banner with a slight delay
        setTimeout(() => {
            cookieConsent.classList.add('show');
        }, 500);
    }
    
    // Handle accept button
    acceptBtn.addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'accepted');
        cookieConsent.classList.remove('show');
        
        // Set a cookie for authentication
        setCookie('auth_enabled', 'true', 30); // 30 days
        
        // Dispatch event that cookies were accepted
        document.dispatchEvent(new CustomEvent('cookiesAccepted'));
    });
    
    // Handle decline button
    declineBtn.addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'declined');
        cookieConsent.classList.remove('show');
        
        // Inform user about limited functionality
        App.showToast('info', 'Some features like secure chat will be unavailable without cookies.');
    });
    
    // Helper function to set cookies
    function setCookie(name, value, days) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + (value || '') + expires + '; path=/; SameSite=Strict; Secure';
    }
});
