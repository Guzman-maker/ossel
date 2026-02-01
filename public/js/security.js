/**
 * OSEL SECURITY CORE v1.0
 * Arquitectura de Seguridad Cliente-Servidor (Simulada para Frontend)
 * Implements: Session Timeout, Rate Limiting, Input Sanitization, Audit Logging
 */

const SecurityConfig = {
    SESSION_TIMEOUT_MS: 120 * 60 * 1000, // 2 Hours (120 minutes)
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5 Minutes
    ADMIN_PHONE_HASH: '7531749441', // In real prod, this should be a hash, not plain text logic
};

const Security = {
    // --- SESSION MANAGEMENT ---
    init: function () {
        this.checkLockout();
        this.setupActivityListeners();
        this.validateSession();
    },

    setupActivityListeners: function () {
        const resetTimer = () => {
            if (this.isLoggedIn()) {
                localStorage.setItem('osel_last_activity', Date.now());
            }
        };
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keypress', resetTimer);
        window.addEventListener('click', resetTimer);
    },

    validateSession: function () {
        if (!this.isLoggedIn()) return;

        const lastActive = parseInt(localStorage.getItem('osel_last_activity') || Date.now());
        const now = Date.now();

        if (now - lastActive > SecurityConfig.SESSION_TIMEOUT_MS) {
            console.warn('[SECURITY] Session expired due to inactivity.');
            this.logout('Tu sesión ha expirado por inactividad.');
        }
    },

    isLoggedIn: function () {
        return localStorage.getItem('osel_user') || localStorage.getItem('osel_admin');
    },

    logout: function (msg) {
        localStorage.removeItem('osel_user');
        localStorage.removeItem('osel_admin');
        if (msg) alert(msg);
        window.location.href = 'login.html';
    },

    // --- RATE LIMITING (Brute Force Protection) ---
    trackLoginAttempt: function (success) {
        if (success) {
            localStorage.removeItem('osel_login_attempts');
            localStorage.removeItem('osel_lockout_until');
            this.audit('LOGIN_SUCCESS', 'Usuario ingresó correctamente');
        } else {
            let attempts = parseInt(localStorage.getItem('osel_login_attempts') || '0') + 1;
            localStorage.setItem('osel_login_attempts', attempts);

            this.audit('LOGIN_FAILED', `Intento fallido #${attempts}`);

            if (attempts >= SecurityConfig.MAX_LOGIN_ATTEMPTS) {
                const lockoutUntil = Date.now() + SecurityConfig.LOCKOUT_DURATION_MS;
                localStorage.setItem('osel_lockout_until', lockoutUntil);
                alert(`⚠️ DETECTADA ACTIVIDAD SOSPECHOSA ⚠️\n\nSe han detectado múltiples intentos fallidos.\nEl sistema se ha bloqueado temporalmente por seguridad.`);
            }
        }
    },

    checkLockout: function () {
        const lockoutUntil = parseInt(localStorage.getItem('osel_lockout_until') || '0');
        if (lockoutUntil > Date.now()) {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
            // Verify we are on login page to disable inputs
            if (window.location.href.includes('login.html')) {
                // Disable forms if possible, or just alert and throw error
                throw new Error(`SYSTEM LOCKED. Try again in ${remaining} minutes.`);
            }
        }
    },

    isLocked: function () {
        return parseInt(localStorage.getItem('osel_lockout_until') || '0') > Date.now();
    },

    // --- INPUT SANITIZATION (XSS Protection) ---
    sanitize: function (str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    validateInput: function (str, type) {
        if (type === 'phone') {
            return /^\d{10}$/.test(str.replace(/\s/g, ''));
        }
        if (type === 'text') {
            return str && str.length > 2 && !/[<>]/g.test(str);
        }
        return true;
    },

    // --- AUDIT LOGGING ---
    audit: function (action, details) {
        const logs = JSON.parse(localStorage.getItem('osel_audit_logs') || '[]');
        logs.unshift({
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            ip: 'Client-Side', // Cannot get real IP in pure JS without external service
            agent: navigator.userAgent
        });
        localStorage.setItem('osel_audit_logs', JSON.stringify(logs.slice(0, 50))); // Keep last 50
    }
};

// Auto-run init
try {
    Security.init();
} catch (e) {
    if (window.location.href.includes('login.html')) {
        alert("SISTEMA BLOQUEADO POR SEGURIDAD: Demasiados intentos fallidos.\nEspera 5 minutos.");
        document.body.innerHTML = '<div style="background:black; color:red; height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; font-family:sans-serif;"><h1>🚫 ACCESO BLOQUEADO</h1><p>Sistema de Protección de Fuerza Bruta activado.</p></div>';
    }
}
