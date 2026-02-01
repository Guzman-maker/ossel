/**
 * OSEL API Configuration
 * Handles dynamic base URL detection for development environments.
 * - If served from port 5500 (Live Server), points to localhost:3000
 * - If served from port 3000 (Express), uses relative paths
 */
const AppConfig = {
    get
        apiBaseUrl() {
        // Check if running on standard Live Server port
        if (window.location.port === '5500') {
            // Development Mode: Separate Frontend/Backend
            return 'http://localhost:3000';
        }
        // Production/Integrated Mode: Same Origin
        return '';
    },

    // Helper to constructing full API URLs
    apiUrl(path) {
        // Ensure path starts with /
        const safePath = path.startsWith('/') ? path : '/' + path;
        return `${this.apiBaseUrl}${safePath}`;
    }
};

console.log('[OSEL Config] API Base URL:', AppConfig.apiBaseUrl || 'Relative (Integrated)');
