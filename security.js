// PhantomView Security Module
// Handles input validation, sanitization, rate limiting, and security measures

class PhantomViewSecurity {
    constructor() {
        this.rateLimitMap = new Map();
        this.blockedIPs = new Set();
        this.suspiciousPatterns = [
            // XSS patterns
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe/gi,
            /<object/gi,
            /<embed/gi,
            
            // SQL injection patterns
            /(\b(union|select|insert|update|delete|drop|create|alter)\b)/gi,
            /(\b(or|and)\b\s+\d+\s*=\s*\d+)/gi,
            /(\b(union|select|insert|update|delete|drop|create|alter)\b)/gi,
            
            // Command injection patterns
            /(\b(cmd|command|exec|system|shell)\b)/gi,
            /[;&|`$()]/g,
            
            // Path traversal patterns
            /\.\.\//g,
            /\.\.\\/g,
            
            // Crypto wallet patterns (blocked for security)
            /(\b(wallet|seed|private key|mnemonic|passphrase)\b)/gi,
            /(\b(metamask|phantom|solflare|backpack)\b)/gi,
            
            // Social media and external links
            /(\b(telegram|discord|twitter|t\.me|discord\.gg|t\.co)\b)/gi,
            /(\b(dm|private message|contact me|message me)\b)/gi,
            
            // Airdrop and scam patterns
            /(\b(airdrop|free|claim|reward|bonus|giveaway)\b)/gi,
            /(\b(click here|verify|confirm|claim now)\b)/gi,
            
            // Personal information patterns
            /(\b(email|phone|address|ssn|credit card)\b)/gi,
            /(\b(send me|dm me|contact)\b)/gi
        ];
        
        this.maxMessageLength = 200;
        this.maxUsernameLength = 20;
        this.rateLimitWindow = 120000; // 2 minutes (doubled from 1 minute)
        this.maxMessagesPerWindow = 50; // Increased from 10 to 50 (5x more lenient)
        this.maxReactionsPerWindow = 20;
    }

    // Sanitize user input
    sanitizeInput(input, type = 'text') {
        if (!input || typeof input !== 'string') {
            return '';
        }

        let sanitized = input.trim();

        // Remove HTML tags
        sanitized = sanitized.replace(/<[^>]*>/g, '');
        
        // Remove script tags specifically
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Remove excessive whitespace
        sanitized = sanitized.replace(/\s+/g, ' ');
        
        // Remove null bytes and control characters
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
        
        // Type-specific sanitization
        switch (type) {
            case 'username':
                // Only allow alphanumeric, underscore, and hyphen
                sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');
                // Limit length
                sanitized = sanitized.substring(0, this.maxUsernameLength);
                break;
                
            case 'message':
                // Remove potentially dangerous characters
                sanitized = sanitized.replace(/[<>]/g, '');
                // Limit length
                sanitized = sanitized.substring(0, this.maxMessageLength);
                break;
                
            case 'ca_address':
                // Only allow alphanumeric characters for CA addresses
                sanitized = sanitized.replace(/[^A-Za-z0-9]/g, '');
                break;
        }

        return sanitized;
    }

    // Check for suspicious content
    containsSuspiciousContent(input) {
        if (!input || typeof input !== 'string') {
            return false;
        }

        const lowerInput = input.toLowerCase();
        
        // Check against suspicious patterns
        for (const pattern of this.suspiciousPatterns) {
            if (pattern.test(lowerInput)) {
                return true;
            }
        }

        // Check for repeated characters (spam)
        const repeatedChars = /(.)\1{4,}/;
        if (repeatedChars.test(input)) {
            return true;
        }

        // Check for excessive caps
        const capsRatio = (input.match(/[A-Z]/g) || []).length / input.length;
        if (capsRatio > 0.7 && input.length > 10) {
            return true;
        }

        return false;
    }

    // Rate limiting
    isRateLimited(userId, action = 'message') {
        const now = Date.now();
        const key = `${userId}_${action}`;
        
        if (!this.rateLimitMap.has(key)) {
            this.rateLimitMap.set(key, []);
        }
        
        const userActions = this.rateLimitMap.get(key);
        
        // Remove old entries outside the window
        const validActions = userActions.filter(timestamp => 
            now - timestamp < this.rateLimitWindow
        );
        
        // Check if user has exceeded limit
        const limit = action === 'reaction' ? this.maxReactionsPerWindow : this.maxMessagesPerWindow;
        
        if (validActions.length >= limit) {
            return true;
        }
        
        // Add current action
        validActions.push(now);
        this.rateLimitMap.set(key, validActions);
        
        return false;
    }

    // Validate username
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }

        const sanitized = this.sanitizeInput(username, 'username');
        
        if (sanitized.length < 2) {
            return { valid: false, error: 'Username must be at least 2 characters' };
        }
        
        if (sanitized.length > this.maxUsernameLength) {
            return { valid: false, error: `Username must be ${this.maxUsernameLength} characters or less` };
        }
        
        if (this.containsSuspiciousContent(sanitized)) {
            return { valid: false, error: 'Username contains invalid characters' };
        }
        
        // Check for reserved usernames
        const reservedNames = ['admin', 'moderator', 'system', 'phantomview', 'phantom', 'view'];
        if (reservedNames.includes(sanitized.toLowerCase())) {
            return { valid: false, error: 'Username is reserved' };
        }
        
        return { valid: true, username: sanitized };
    }

    // Validate message
    validateMessage(message, userId) {
        if (!message || typeof message !== 'string') {
            return { valid: false, error: 'Message is required' };
        }

        const sanitized = this.sanitizeInput(message, 'message');
        
        if (sanitized.length < 1) {
            return { valid: false, error: 'Message cannot be empty' };
        }
        
        if (sanitized.length > this.maxMessageLength) {
            return { valid: false, error: `Message must be ${this.maxMessageLength} characters or less` };
        }
        
        if (this.containsSuspiciousContent(sanitized)) {
            return { valid: false, error: 'Message contains potentially unsafe content' };
        }
        
        // Check rate limiting
        if (this.isRateLimited(userId, 'message')) {
            return { valid: false, error: 'Please slow down - too many messages' };
        }
        
        return { valid: true, message: sanitized };
    }

    // Validate CA address
    validateCAAddress(caAddress) {
        if (!caAddress || typeof caAddress !== 'string') {
            return { valid: false, error: 'CA address is required' };
        }

        const sanitized = this.sanitizeInput(caAddress, 'ca_address');
        
        // Check if it looks like a valid Solana address
        if (!/^[A-Za-z0-9]{32,44}$/.test(sanitized)) {
            return { valid: false, error: 'Invalid CA address format' };
        }
        
        return { valid: true, caAddress: sanitized };
    }

    // Generate secure random ID
    generateSecureId() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Hash sensitive data (for logging purposes)
    hashSensitiveData(data) {
        if (!data) return '';
        
        // Simple hash for logging - not for security purposes
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    // Log security events
    logSecurityEvent(event, details = {}) {
        const timestamp = new Date().toISOString();
        const eventData = {
            timestamp,
            event,
            details: {
                ...details,
                // Hash sensitive data
                userId: details.userId ? this.hashSensitiveData(details.userId) : undefined,
                message: details.message ? this.hashSensitiveData(details.message) : undefined
            }
        };
        
        console.log('🔒 Security Event:', eventData);
        
        // Store in chrome storage for debugging
        chrome.storage.local.get(['phantomview_security_logs'], function(result) {
            const logs = result.phantomview_security_logs || [];
            logs.push(eventData);
            
            // Keep only last 100 logs
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            chrome.storage.local.set({ 'phantomview_security_logs': logs });
        });
    }

    // Check if user is blocked
    isUserBlocked(userId) {
        // Check if user is in blocked list
        return this.blockedIPs.has(userId);
    }

    // Block user
    blockUser(userId, reason = 'Violation') {
        this.blockedIPs.add(userId);
        this.logSecurityEvent('USER_BLOCKED', { userId, reason });
    }

    // Unblock user
    unblockUser(userId) {
        this.blockedIPs.delete(userId);
        this.logSecurityEvent('USER_UNBLOCKED', { userId });
    }

    // Get security statistics
    getSecurityStats() {
        return {
            blockedUsers: this.blockedIPs.size,
            rateLimitEntries: this.rateLimitMap.size,
            maxMessageLength: this.maxMessageLength,
            maxUsernameLength: this.maxUsernameLength,
            rateLimitWindow: this.rateLimitWindow,
            maxMessagesPerWindow: this.maxMessagesPerWindow,
            maxReactionsPerWindow: this.maxReactionsPerWindow
        };
    }

    // Clean up old rate limit entries
    cleanupRateLimits() {
        const now = Date.now();
        const windowMs = this.rateLimitWindow;
        
        for (const [key, timestamps] of this.rateLimitMap.entries()) {
            const validTimestamps = timestamps.filter(timestamp => 
                now - timestamp < windowMs
            );
            
            if (validTimestamps.length === 0) {
                this.rateLimitMap.delete(key);
            } else {
                this.rateLimitMap.set(key, validTimestamps);
            }
        }
    }
}

// Create global security instance
const phantomViewSecurity = new PhantomViewSecurity();

// Cleanup rate limits every 5 minutes
setInterval(() => {
    phantomViewSecurity.cleanupRateLimits();
}, 300000);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = phantomViewSecurity;
}