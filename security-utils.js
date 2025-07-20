/**
 * PhantomView Security Utilities
 * Provides security functions for input sanitization, output encoding, and validation
 */

class SecurityUtils {
  /**
   * Sanitize user input to prevent XSS attacks
   * @param {string} input - User input to sanitize
   * @param {string} type - Type of input (text, html, url, etc.)
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') {
      return '';
    }

    switch (type) {
      case 'text':
        return this.sanitizeText(input);
      case 'html':
        return this.sanitizeHTML(input);
      case 'url':
        return this.sanitizeURL(input);
      case 'username':
        return this.sanitizeUsername(input);
      case 'token':
        return this.sanitizeToken(input);
      default:
        return this.sanitizeText(input);
    }
  }

  /**
   * Sanitize plain text input
   * @param {string} input - Text input
   * @returns {string} Sanitized text
   */
  static sanitizeText(input) {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize HTML input
   * @param {string} input - HTML input
   * @returns {string} Sanitized HTML
   */
  static sanitizeHTML(input) {
    const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'br'];
    const allowedAttributes = ['href', 'target'];
    
    // Remove all HTML tags except allowed ones
    let sanitized = input.replace(/<[^>]*>/g, (match) => {
      const tag = match.match(/<(\w+)/)?.[1]?.toLowerCase();
      if (allowedTags.includes(tag)) {
        // Only allow specific attributes for allowed tags
        if (tag === 'a') {
          const href = match.match(/href=["']([^"']+)["']/)?.[1];
          if (href && this.isValidURL(href)) {
            return `<a href="${this.escapeHTML(href)}" target="_blank" rel="noopener noreferrer">`;
          }
        }
        return match;
      }
      return '';
    });

    return this.escapeHTML(sanitized);
  }

  /**
   * Sanitize URL input
   * @param {string} input - URL input
   * @returns {string} Sanitized URL or empty string
   */
  static sanitizeURL(input) {
    if (!this.isValidURL(input)) {
      return '';
    }
    
    // Only allow http and https protocols
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      return '';
    }
    
    return input.trim();
  }

  /**
   * Sanitize username input
   * @param {string} input - Username input
   * @returns {string} Sanitized username
   */
  static sanitizeUsername(input) {
    return input
      .replace(/[^a-zA-Z0-9_-]/g, '') // Only allow alphanumeric, underscore, hyphen
      .toLowerCase()
      .trim()
      .substring(0, 20); // Limit to 20 characters
  }

  /**
   * Sanitize token input
   * @param {string} input - Token input
   * @returns {string} Sanitized token
   */
  static sanitizeToken(input) {
    return input
      .replace(/[^a-zA-Z0-9]/g, '') // Only allow alphanumeric
      .toUpperCase()
      .trim()
      .substring(0, 10); // Limit to 10 characters
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid URL
   */
  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Escape HTML entities
   * @param {string} input - Input to escape
   * @returns {string} Escaped HTML
   */
  static escapeHTML(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Validate and sanitize message content
   * @param {string} message - Message content
   * @returns {string} Sanitized message
   */
  static sanitizeMessage(message) {
    if (typeof message !== 'string') {
      return '';
    }

    // Remove any script tags
    message = message.replace(/<script[^>]*>.*?<\/script>/gi, '');
    
    // Remove any iframe tags
    message = message.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    
    // Remove any object tags
    message = message.replace(/<object[^>]*>.*?<\/object>/gi, '');
    
    // Remove any embed tags
    message = message.replace(/<embed[^>]*>/gi, '');
    
    // Remove any form tags
    message = message.replace(/<form[^>]*>.*?<\/form>/gi, '');
    
    // Remove any input tags
    message = message.replace(/<input[^>]*>/gi, '');
    
    // Remove any button tags
    message = message.replace(/<button[^>]*>.*?<\/button>/gi, '');
    
    // Remove any link tags
    message = message.replace(/<link[^>]*>/gi, '');
    
    // Remove any meta tags
    message = message.replace(/<meta[^>]*>/gi, '');
    
    // Remove any style tags
    message = message.replace(/<style[^>]*>.*?<\/style>/gi, '');
    
    // Remove any event handlers
    message = message.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove any javascript: protocol
    message = message.replace(/javascript:/gi, '');
    
    // Remove any data: protocol
    message = message.replace(/data:/gi, '');
    
    // Remove any vbscript: protocol
    message = message.replace(/vbscript:/gi, '');
    
    // Remove any file: protocol
    message = message.replace(/file:/gi, '');
    
    // Limit length
    message = message.trim().substring(0, 500);
    
    return message;
  }

  /**
   * Generate secure random string
   * @param {number} length - Length of random string
   * @returns {string} Secure random string
   */
  static generateSecureRandom(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
    return result;
  }

  /**
   * Hash string using SHA-256
   * @param {string} input - Input to hash
   * @returns {Promise<string>} Hashed string
   */
  static async hashString(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate extension permissions
   * @returns {boolean} True if permissions are secure
   */
  static validatePermissions() {
    const manifest = chrome.runtime.getManifest();
    const dangerousPermissions = ['<all_urls>', 'http://*/*', 'https://*/*'];
    
    for (const permission of dangerousPermissions) {
      if (manifest.permissions && manifest.permissions.includes(permission)) {
        return false;
      }
      if (manifest.host_permissions && manifest.host_permissions.includes(permission)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if current context is secure
   * @returns {boolean} True if secure context
   */
  static isSecureContext() {
    return window.isSecureContext;
  }

  /**
   * Validate data before storing
   * @param {any} data - Data to validate
   * @returns {boolean} True if data is valid
   */
  static validateStorageData(data) {
    if (data === null || data === undefined) {
      return false;
    }
    
    // Check for circular references
    try {
      JSON.stringify(data);
    } catch {
      return false;
    }
    
    // Check size limit (1MB)
    const size = new Blob([JSON.stringify(data)]).size;
    if (size > 1024 * 1024) {
      return false;
    }
    
    return true;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityUtils;
}

// Make available globally in extension context
if (typeof window !== 'undefined') {
  window.SecurityUtils = SecurityUtils;
} 