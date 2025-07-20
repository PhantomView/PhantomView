/**
 * PhantomView Security Validator
 * Validates the Chrome extension for security compliance
 */

class SecurityValidator {
  constructor() {
    this.vulnerabilities = [];
    this.warnings = [];
    this.passed = [];
  }

  /**
   * Validate Content Security Policy
   */
  validateCSP() {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!csp) {
      this.warnings.push('No Content Security Policy meta tag found');
    } else {
      const cspValue = csp.getAttribute('content');
      if (cspValue.includes("'unsafe-eval'")) {
        this.vulnerabilities.push('CSP allows unsafe-eval - potential security risk');
      }
      if (cspValue.includes("'unsafe-inline'")) {
        this.warnings.push('CSP allows unsafe-inline - consider removing for better security');
      }
      if (!cspValue.includes("script-src 'self'")) {
        this.vulnerabilities.push('CSP does not restrict scripts to same origin');
      }
    }
    this.passed.push('CSP validation completed');
  }

  /**
   * Validate input sanitization
   */
  validateInputSanitization() {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      if (!input.hasAttribute('maxlength')) {
        this.warnings.push(`Input ${input.name || input.id} has no maxlength attribute`);
      }
      if (input.type === 'text' && !input.pattern) {
        this.warnings.push(`Text input ${input.name || input.id} has no pattern validation`);
      }
    });
    this.passed.push('Input sanitization validation completed');
  }

  /**
   * Validate external connections
   */
  validateExternalConnections() {
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (!src.startsWith('chrome-extension://') && !src.startsWith('/')) {
        this.vulnerabilities.push(`External script loaded: ${src}`);
      }
    });

    const links = document.querySelectorAll('link[href]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href.startsWith('chrome-extension://') && !href.startsWith('/')) {
        this.warnings.push(`External resource loaded: ${href}`);
      }
    });
    this.passed.push('External connections validation completed');
  }

  /**
   * Validate permissions
   */
  validatePermissions() {
    const manifest = chrome.runtime.getManifest();
    const requiredPermissions = ['storage', 'tabs', 'windows', 'scripting'];
    const optionalPermissions = ['contextMenus'];
    
    requiredPermissions.forEach(permission => {
      if (!manifest.permissions.includes(permission)) {
        this.vulnerabilities.push(`Required permission missing: ${permission}`);
      }
    });

    const dangerousPermissions = ['<all_urls>', 'http://*/*', 'https://*/*'];
    dangerousPermissions.forEach(permission => {
      if (manifest.permissions.includes(permission) || 
          (manifest.host_permissions && manifest.host_permissions.includes(permission))) {
        this.warnings.push(`Broad permission granted: ${permission}`);
      }
    });
    this.passed.push('Permissions validation completed');
  }

  /**
   * Validate data storage
   */
  validateDataStorage() {
    // Check for localStorage usage
    if (typeof localStorage !== 'undefined') {
      this.warnings.push('localStorage usage detected - consider using chrome.storage for better security');
    }

    // Check for sessionStorage usage
    if (typeof sessionStorage !== 'undefined') {
      this.warnings.push('sessionStorage usage detected - consider using chrome.storage for better security');
    }
    this.passed.push('Data storage validation completed');
  }

  /**
   * Validate XSS protection
   */
  validateXSSProtection() {
    // Check for innerHTML usage
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      const content = script.textContent;
      if (content.includes('innerHTML') || content.includes('outerHTML')) {
        this.vulnerabilities.push('innerHTML/outerHTML usage detected - potential XSS risk');
      }
      if (content.includes('document.write') || content.includes('document.writeln')) {
        this.vulnerabilities.push('document.write usage detected - potential XSS risk');
      }
    });
    this.passed.push('XSS protection validation completed');
  }

  /**
   * Run all security validations
   */
  runAllValidations() {
    console.log('🔒 Starting PhantomView Security Validation...');
    
    this.validateCSP();
    this.validateInputSanitization();
    this.validateExternalConnections();
    this.validatePermissions();
    this.validateDataStorage();
    this.validateXSSProtection();

    this.generateReport();
  }

  /**
   * Generate security report
   */
  generateReport() {
    console.log('\n📊 Security Validation Report');
    console.log('=============================');
    
    if (this.passed.length > 0) {
      console.log('\n✅ Passed Checks:');
      this.passed.forEach(check => console.log(`  - ${check}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.vulnerabilities.length > 0) {
      console.log('\n🚨 Vulnerabilities Found:');
      this.vulnerabilities.forEach(vuln => console.log(`  - ${vuln}`));
    }

    console.log('\n📈 Summary:');
    console.log(`  - Passed: ${this.passed.length}`);
    console.log(`  - Warnings: ${this.warnings.length}`);
    console.log(`  - Vulnerabilities: ${this.vulnerabilities.length}`);

    if (this.vulnerabilities.length === 0) {
      console.log('\n🎉 No critical vulnerabilities found!');
    } else {
      console.log('\n❌ Critical vulnerabilities need to be addressed before release.');
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityValidator;
}

// Auto-run if in browser context
if (typeof window !== 'undefined') {
  const validator = new SecurityValidator();
  validator.runAllValidations();
} 