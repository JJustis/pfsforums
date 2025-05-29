/**
 * SEO Article Form Debug Tool
 * Add this script to your page temporarily to debug the SEO article form issues
 */

// Run when page loads
window.addEventListener('load', function() {
    console.log('SEO Article Debug Tool running...');
    
    // Check if we're on the SEO page
    const seoPage = document.getElementById('page-seo');
    if (!seoPage || seoPage.classList.contains('hidden')) {
        console.log('Not on SEO page, skipping debug');
        return;
    }
    
    console.log('SEO Page detected!');
    
    // Check if the article section exists
    const articleSection = document.getElementById('seo-articles');
    if (!articleSection) {
        console.error('❌ Article section (id="seo-articles") not found!');
        console.log('Solution: Make sure you added the HTML for the article management section');
    } else {
        console.log('✅ Article section found');
    }
    
    // Check SEO content structure
    const seoContent = document.getElementById('seo-content');
    if (!seoContent) {
        console.error('❌ SEO content section (id="seo-content") not found!');
    } else {
        console.log('✅ SEO content section found');
    }
    
    // Check if user is admin
    const isAdmin = window.App && window.App.isAdmin;
    console.log('Admin status:', isAdmin ? '✅ User is admin' : '❌ User is not admin');
    
    // Try to show the article section manually
    if (articleSection) {
        // Make sure the article section is not hidden
        articleSection.classList.remove('hidden');
        console.log('Attempted to make article section visible');
        
        // Hide SEO content if we're showing articles
        if (seoContent) {
            seoContent.classList.add('hidden');
            console.log('SEO content hidden');
        }
    }
    
    // Print the full SEO page structure for debugging
    console.log('SEO Page Structure:', seoPage.innerHTML);
});
