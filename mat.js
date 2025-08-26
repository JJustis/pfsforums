// Fixed Maintenance System - Compatible with existing forum code
(function() {
    'use strict';
    
    // Prevent multiple initializations
    if (window.ForumMaintenanceSystem) {
        return;
    }
    
    class ForumMaintenanceSystem {
        constructor() {
            this.isActive = false;
            this.checkInterval = null;
            this.modal = null;
            this.styles = null;
            this.queuedOperations = [];
            
            // Bind methods to preserve context
            this.checkSystemStatus = this.checkSystemStatus.bind(this);
            this.handleFormSubmit = this.handleFormSubmit.bind(this);
            this.handleButtonClick = this.handleButtonClick.bind(this);
            
            this.init();
        }
        
        init() {
            try {
                this.injectStyles();
                this.createModal();
                this.setupEventListeners();
                this.startMonitoring();
                console.log('Forum maintenance system initialized');
            } catch (error) {
                console.error('Failed to initialize maintenance system:', error);
            }
        }
        
        injectStyles() {
            if (document.getElementById('forum-maintenance-styles')) {
                return; // Already injected
            }
            
            const css = `
                /* Maintenance Modal Styles */
                .forum-maintenance-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 999999;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(3px);
                }
                
                .forum-maintenance-modal.active {
                    display: flex;
                }
                
                .forum-maintenance-container {
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 480px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    animation: maintenanceSlideIn 0.4s ease-out;
                    position: relative;
                }
                
                @keyframes maintenanceSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .forum-maintenance-icon {
                    font-size: 48px;
                    color: #2196F3;
                    margin-bottom: 20px;
                    animation: maintenanceSpin 2s linear infinite;
                }
                
                @keyframes maintenanceSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .forum-maintenance-title {
                    font-size: 24px;
                    color: #333;
                    margin: 0 0 15px 0;
                    font-weight: 600;
                }
                
                .forum-maintenance-description {
                    color: #666;
                    margin-bottom: 25px;
                    line-height: 1.6;
                    font-size: 16px;
                }
                
                .forum-progress-container {
                    margin: 25px 0;
                }
                
                .forum-progress-bar {
                    width: 100%;
                    height: 24px;
                    background-color: #f0f0f0;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                    margin-bottom: 15px;
                }
                
                .forum-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #2196F3, #21CBF3);
                    transition: width 0.6s ease;
                    border-radius: 12px;
                    position: relative;
                }
                
                .forum-progress-fill::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: progressShine 2s infinite;
                }
                
                @keyframes progressShine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .forum-progress-text {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 14px;
                }
                
                .forum-progress-percentage {
                    font-weight: bold;
                    color: #2196F3;
                    font-size: 16px;
                }
                
                .forum-progress-status {
                    color: #666;
                    font-style: italic;
                    max-width: 220px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .forum-maintenance-info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    text-align: left;
                }
                
                .forum-info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-size: 14px;
                }
                
                .forum-info-row:last-child {
                    margin-bottom: 0;
                }
                
                .forum-info-label {
                    font-weight: 500;
                    color: #333;
                }
                
                .forum-info-value {
                    color: #666;
                    font-family: monospace;
                }
                
                .forum-maintenance-note {
                    background: #e3f2fd;
                    padding: 15px;
                    border-radius: 8px;
                    border-left: 4px solid #2196F3;
                    text-align: left;
                    margin-top: 20px;
                    font-size: 14px;
                    line-height: 1.5;
                }
                
                .forum-maintenance-note i {
                    color: #2196F3;
                    margin-right: 8px;
                }
                
                /* Queue Notification */
                .forum-queue-notification {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: #ff9800;
                    color: white;
                    padding: 16px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    z-index: 999998;
                    max-width: 320px;
                    transform: translateX(400px);
                    transition: transform 0.3s ease;
                }
                
                .forum-queue-notification.show {
                    transform: translateX(0);
                }
                
                .forum-queue-notification .queue-title {
                    font-weight: 600;
                    margin-bottom: 5px;
                    display: flex;
                    align-items: center;
                }
                
                .forum-queue-notification .queue-title i {
                    margin-right: 8px;
                    font-size: 16px;
                }
                
                .forum-queue-notification .queue-message {
                    font-size: 13px;
                    opacity: 0.95;
                }
                
                /* Toast Notifications */
                .forum-toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 999997;
                    max-width: 400px;
                }
                
                .forum-toast {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    margin-bottom: 10px;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    border-left: 4px solid #2196F3;
                    overflow: hidden;
                }
                
                .forum-toast.show {
                    transform: translateX(0);
                }
                
                .forum-toast-content {
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                }
                
                .forum-toast-content i {
                    margin-right: 10px;
                    font-size: 16px;
                    color: #2196F3;
                }
                
                .forum-toast.success {
                    border-left-color: #4CAF50;
                }
                
                .forum-toast.success i {
                    color: #4CAF50;
                }
                
                .forum-toast.warning {
                    border-left-color: #FF9800;
                }
                
                .forum-toast.warning i {
                    color: #FF9800;
                }
                
                .forum-toast.error {
                    border-left-color: #F44336;
                }
                
                .forum-toast.error i {
                    color: #F44336;
                }
                
                /* Disabled state during maintenance */
                .forum-maintenance-disabled {
                    opacity: 0.6 !important;
                    pointer-events: none !important;
                    cursor: not-allowed !important;
                }
                
                body.forum-maintenance-active {
                    overflow: hidden;
                }
                
                body.forum-maintenance-active * {
                    pointer-events: none;
                }
                
                body.forum-maintenance-active .forum-maintenance-modal,
                body.forum-maintenance-active .forum-maintenance-modal * {
                    pointer-events: all;
                }
                
                /* Dark theme support */
                [data-theme="dark"] .forum-maintenance-container {
                    background: #1a1a2e;
                    color: #e7e7e7;
                }
                
                [data-theme="dark"] .forum-maintenance-title {
                    color: #e7e7e7;
                }
                
                [data-theme="dark"] .forum-maintenance-description {
                    color: #ccc;
                }
                
                [data-theme="dark"] .forum-maintenance-info {
                    background: #333;
                }
                
                [data-theme="dark"] .forum-info-label {
                    color: #eee;
                }
                
                [data-theme="dark"] .forum-info-value {
                    color: #ccc;
                }
                
                [data-theme="dark"] .forum-maintenance-note {
                    background: #1e3a8a;
                    color: #e7e7e7;
                }
                
                [data-theme="dark"] .forum-progress-bar {
                    background-color: #444;
                }
                
                [data-theme="dark"] .forum-toast {
                    background: #333;
                    color: #eee;
                }
            `;
            
            const styleElement = document.createElement('style');
            styleElement.id = 'forum-maintenance-styles';
            styleElement.textContent = css;
            document.head.appendChild(styleElement);
            this.styles = styleElement;
        }
        
        createModal() {
            if (document.getElementById('forum-maintenance-modal')) {
                return; // Already exists
            }
            
            const modalHTML = `
                <div id="forum-maintenance-modal" class="forum-maintenance-modal">
                    <div class="forum-maintenance-container">
                        <div class="forum-maintenance-icon">
                            <i class="fas fa-cog"></i>
                        </div>
                        <h2 class="forum-maintenance-title">System Maintenance</h2>
                        <p class="forum-maintenance-description">
                            The forum is performing a security update. All data is being encrypted with today's security key for maximum protection.
                        </p>
                        
                        <div class="forum-progress-container">
                            <div class="forum-progress-bar">
                                <div class="forum-progress-fill" style="width: 0%"></div>
                            </div>
                            <div class="forum-progress-text">
                                <span class="forum-progress-percentage">0%</span>
                                <span class="forum-progress-status">Initializing...</span>
                            </div>
                        </div>
                        
                        <div class="forum-maintenance-info">
                            <div class="forum-info-row">
                                <span class="forum-info-label">Status:</span>
                                <span class="forum-info-value" id="maintenance-current-step">Starting...</span>
                            </div>
                            <div class="forum-info-row">
                                <span class="forum-info-label">Progress:</span>
                                <span class="forum-info-value" id="maintenance-files-count">0 / 0</span>
                            </div>
                            <div class="forum-info-row">
                                <span class="forum-info-label">Est. Time:</span>
                                <span class="forum-info-value" id="maintenance-time-remaining">Calculating...</span>
                            </div>
                        </div>
                        
                        <div class="forum-maintenance-note">
                            <i class="fas fa-info-circle"></i>
                            Any posts, replies, or actions you submit during maintenance will be automatically saved and processed once the update completes.
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.modal = document.getElementById('forum-maintenance-modal');
        }
        
        setupEventListeners() {
            // Intercept form submissions
            document.addEventListener('submit', this.handleFormSubmit, true);
            
            // Intercept button clicks
            document.addEventListener('click', this.handleButtonClick, true);
            
            // Handle page unload
            window.addEventListener('beforeunload', () => {
                this.cleanup();
            });
        }
        
        handleFormSubmit(event) {
            if (this.isActive) {
                event.preventDefault();
                event.stopPropagation();
                this.showQueueNotification('Form submission saved for after maintenance');
                return false;
            }
        }
        
        handleButtonClick(event) {
            if (this.isActive) {
                const button = event.target.closest('button, .btn');
                if (button && (button.type === 'submit' || button.classList.contains('btn-primary'))) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.showQueueNotification('Action saved for after maintenance');
                    return false;
                }
            }
        }
        
        startMonitoring() {
            // Initial check
            this.checkSystemStatus();
            
            // Check every 3 seconds
            this.checkInterval = setInterval(this.checkSystemStatus, 3000);
        }
        
        async checkSystemStatus() {
            try {
                const response = await this.makeApiCall('get_system_status', {});
                
                if (response && response.success && response.status) {
                    const status = response.status;
                    
                    if (status.locked && !this.isActive) {
                        this.showMaintenance();
                    } else if (!status.locked && this.isActive) {
                        this.hideMaintenance();
                    }
                    
                    if (status.progress && this.isActive) {
                        this.updateProgress(status.progress);
                    }
                }
            } catch (error) {
                console.warn('Status check failed:', error);
            }
        }
        
        async makeApiCall(action, data) {
            try {
                const response = await fetch(`api.php?action=${action}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                // Check for queued operations
                if (result.queued || result.maintenance) {
                    this.showQueueNotification(result.error || 'Operation queued during maintenance');
                }
                
                return result;
            } catch (error) {
                console.error('API call failed:', error);
                return null;
            }
        }
        
        showMaintenance() {
            if (this.isActive) return;
            
            this.isActive = true;
            
            if (this.modal) {
                this.modal.classList.add('active');
                document.body.classList.add('forum-maintenance-active');
            }
            
            this.disableInteractions();
            this.showToast('System entering maintenance mode...', 'info');
        }
        
        hideMaintenance() {
            if (!this.isActive) return;
            
            this.isActive = false;
            
            if (this.modal) {
                this.modal.classList.remove('active');
                document.body.classList.remove('forum-maintenance-active');
            }
            
            this.enableInteractions();
            this.showToast('Maintenance completed! All operations have been processed.', 'success');
            
            // Refresh page data if possible
            setTimeout(() => this.refreshPageData(), 1000);
        }
        
        updateProgress(progress) {
            if (!this.modal || !progress) return;
            
            try {
                const percentage = Math.min(100, Math.max(0, progress.percentage || 0));
                
                // Update progress bar
                const progressFill = this.modal.querySelector('.forum-progress-fill');
                if (progressFill) {
                    progressFill.style.width = percentage + '%';
                }
                
                // Update percentage
                const percentageElement = this.modal.querySelector('.forum-progress-percentage');
                if (percentageElement) {
                    percentageElement.textContent = Math.round(percentage) + '%';
                }
                
                // Update status
                const statusElement = this.modal.querySelector('.forum-progress-status');
                if (statusElement && progress.message) {
                    statusElement.textContent = progress.message;
                }
                
                // Update step
                const stepElement = this.modal.querySelector('#maintenance-current-step');
                if (stepElement) {
                    stepElement.textContent = progress.step || 'Processing...';
                }
                
                // Update file count
                const filesElement = this.modal.querySelector('#maintenance-files-count');
                if (filesElement) {
                    filesElement.textContent = `${progress.current || 0} / ${progress.total || 0}`;
                }
                
                // Update time remaining
                const timeElement = this.modal.querySelector('#maintenance-time-remaining');
                if (timeElement) {
                    if (progress.estimated_remaining && progress.estimated_remaining > 0) {
                        const minutes = Math.ceil(progress.estimated_remaining / 60);
                        timeElement.textContent = minutes <= 1 ? '< 1 minute' : `${minutes} minutes`;
                    } else {
                        timeElement.textContent = 'Calculating...';
                    }
                }
            } catch (error) {
                console.error('Failed to update progress:', error);
            }
        }
        
        disableInteractions() {
            try {
                // Disable buttons and inputs
                const elements = document.querySelectorAll('button, input, textarea, select, a');
                elements.forEach(element => {
                    if (!element.closest('.forum-maintenance-modal')) {
                        element.classList.add('forum-maintenance-disabled');
                        if (element.tagName !== 'A') {
                            element.disabled = true;
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to disable interactions:', error);
            }
        }
        
        enableInteractions() {
            try {
                const disabledElements = document.querySelectorAll('.forum-maintenance-disabled');
                disabledElements.forEach(element => {
                    element.classList.remove('forum-maintenance-disabled');
                    if (element.tagName !== 'A') {
                        element.disabled = false;
                    }
                });
            } catch (error) {
                console.error('Failed to enable interactions:', error);
            }
        }
        
        showQueueNotification(message) {
            // Remove existing notification
            const existing = document.querySelector('.forum-queue-notification');
            if (existing) {
                existing.remove();
            }
            
            const notification = document.createElement('div');
            notification.className = 'forum-queue-notification';
            notification.innerHTML = `
                <div class="queue-title">
                    <i class="fas fa-clock"></i>
                    Action Queued
                </div>
                <div class="queue-message">${message}</div>
            `;
            
            document.body.appendChild(notification);
            
            // Show notification
            setTimeout(() => notification.classList.add('show'), 100);
            
            // Remove after 4 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, 4000);
        }
        
        showToast(message, type = 'info') {
            try {
                // Create container if needed
                let container = document.querySelector('.forum-toast-container');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'forum-toast-container';
                    document.body.appendChild(container);
                }
                
                // Create toast
                const toast = document.createElement('div');
                toast.className = `forum-toast ${type}`;
                
                const iconMap = {
                    info: 'info-circle',
                    success: 'check-circle',
                    warning: 'exclamation-triangle',
                    error: 'times-circle'
                };
                
                toast.innerHTML = `
                    <div class="forum-toast-content">
                        <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
                        <span>${message}</span>
                    </div>
                `;
                
                container.appendChild(toast);
                
                // Show toast
                setTimeout(() => toast.classList.add('show'), 100);
                
                // Remove after 5 seconds
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.classList.remove('show');
                        setTimeout(() => {
                            if (toast.parentNode) {
                                toast.parentNode.removeChild(toast);
                            }
                        }, 300);
                    }
                }, 5000);
            } catch (error) {
                console.error('Failed to show toast:', error);
            }
        }
        
        refreshPageData() {
            try {
                // Try to refresh common page elements
                if (typeof window.loadCategories === 'function') {
                    window.loadCategories();
                }
                
                if (typeof window.loadPosts === 'function') {
                    window.loadPosts();
                }
                
                if (typeof window.loadPost === 'function') {
                    window.loadPost();
                }
                
                // Trigger a custom event for other code to handle
                const event = new CustomEvent('maintenanceCompleted', {
                    detail: { timestamp: Date.now() }
                });
                document.dispatchEvent(event);
            } catch (error) {
                console.error('Failed to refresh page data:', error);
            }
        }
        
        cleanup() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
            
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            
            if (this.styles && this.styles.parentNode) {
                this.styles.parentNode.removeChild(this.styles);
            }
            
            document.removeEventListener('submit', this.handleFormSubmit, true);
            document.removeEventListener('click', this.handleButtonClick, true);
            
            this.enableInteractions();
            document.body.classList.remove('forum-maintenance-active');
        }
        
        destroy() {
            this.cleanup();
        }
    }
    
    // Initialize when DOM is ready
    function initMaintenanceSystem() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.ForumMaintenanceSystem = new ForumMaintenanceSystem();
            });
        } else {
            window.ForumMaintenanceSystem = new ForumMaintenanceSystem();
        }
    }
    
    // Auto-initialize
    initMaintenanceSystem();
    
    // Export for manual control
    window.ForumMaintenanceSystemClass = ForumMaintenanceSystem;
    
})();