# 🔒 PhantomView Security Documentation

## Overview

PhantomView is a Chrome extension that provides real-time analytics and embedded chat functionality for Solana trading platforms. This document outlines the security measures implemented to protect users and maintain platform integrity.

## 🛡️ Security Features

### 1. Input Validation & Sanitization

#### Username Validation
- **Length**: 2-20 characters
- **Characters**: Alphanumeric, underscore, and hyphen only
- **Reserved Names**: Blocked usernames include `admin`, `moderator`, `system`, `phantomview`, `phantom`, `view`
- **Sanitization**: Removes HTML tags, script content, and dangerous characters

#### Message Validation
- **Length**: 1-200 characters
- **Content Filtering**: Blocks XSS, SQL injection, command injection attempts
- **Spam Detection**: Prevents repeated characters, excessive caps, suspicious patterns
- **Link Blocking**: All external links are blocked for user safety

#### CA Address Validation
- **Format**: 32-44 alphanumeric characters (Solana address format)
- **Sanitization**: Removes all non-alphanumeric characters
- **Validation**: Ensures proper Solana address structure

### 2. Rate Limiting

#### Message Rate Limiting
- **Window**: 2 minutes (120,000ms) - doubled from 1 minute
- **Limit**: 50 messages per window - increased from 10 (5x more lenient)
- **Action**: Messages blocked when limit exceeded

#### Reaction Rate Limiting
- **Window**: 1 minute (60,000ms)
- **Limit**: 20 reactions per window
- **Action**: Reactions blocked when limit exceeded

#### Automatic Cleanup
- **Frequency**: Every 5 minutes
- **Action**: Removes expired rate limit entries

### 3. Content Filtering

#### Blocked Patterns
- **XSS Attacks**: `<script>`, `javascript:`, `onclick=`, `<iframe>`
- **SQL Injection**: `UNION`, `SELECT`, `INSERT`, `DROP`, `CREATE`
- **Command Injection**: `cmd`, `exec`, `system`, `shell`
- **Path Traversal**: `../`, `..\`
- **Crypto Scams**: `wallet`, `seed`, `private key`, `mnemonic`
- **Social Media**: `telegram`, `discord`, `twitter`, `t.me`
- **Airdrop Scams**: `airdrop`, `free`, `claim`, `reward`
- **Personal Info**: `email`, `phone`, `address`, `ssn`

#### Spam Detection
- **Repeated Characters**: 5+ consecutive identical characters
- **Excessive Caps**: >70% uppercase in messages >10 characters
- **Suspicious Content**: Pattern matching against known scam formats

### 4. User Management

#### Blocking System
- **Manual Blocking**: Administrators can block users
- **Automatic Blocking**: Users violating security policies
- **Block Persistence**: Blocked users stored in memory
- **Block Logging**: All blocking events logged with timestamps

#### User Tracking
- **Activity Monitoring**: Track user message and reaction patterns
- **Violation Logging**: Security events logged with hashed user data
- **Rate Limit Tracking**: Per-user rate limit enforcement

### 5. Data Protection

#### Sensitive Data Handling
- **Hashing**: User IDs and messages hashed in logs
- **No Storage**: Sensitive data not stored in plain text
- **Minimal Collection**: Only necessary data collected
- **Local Storage**: User preferences stored locally only

#### Firebase Security
- **Read-Only Access**: Extension only reads/writes to specific paths
- **No Admin Access**: No database administration capabilities
- **Temporary Data**: Chat messages auto-delete after 5 minutes
- **No Encryption**: Messages not encrypted (public chat)

### 6. Extension Permissions

#### Required Permissions
- **`activeTab`**: Access current trading platform page
- **`storage`**: Save user preferences locally
- **`tabs`**: Manage tab operations and messaging
- **`scripting`**: Inject chat UI into web pages

#### Permission Justification
- **Minimal Scope**: Only necessary permissions requested
- **User Control**: Users can revoke permissions anytime
- **No Network Access**: No direct network requests outside Firebase
- **No File Access**: No access to user files or system

## 🔍 Security Monitoring

### Event Logging
All security events are logged with:
- **Timestamp**: ISO 8601 format
- **Event Type**: Categorized security events
- **User Data**: Hashed user identifiers
- **Details**: Relevant event information
- **Storage**: Last 100 events stored locally

### Event Types
- `INVALID_USERNAME`: Username validation failed
- `INVALID_CA_ADDRESS`: CA address validation failed
- `MESSAGE_VALIDATION_FAILED`: Message validation failed
- `BLOCKED_USER_ATTEMPT`: Blocked user attempted access
- `MESSAGE_SENT`: Successful message sent
- `REACTION_RATE_LIMITED`: User exceeded reaction rate limit
- `INVALID_REACTION`: Invalid reaction emoji attempted
- `REACTION_UPDATED`: Successful reaction update
- `USER_BLOCKED`: User blocked by administrator
- `USER_UNBLOCKED`: User unblocked by administrator

### Security Statistics
- **Blocked Users**: Count of currently blocked users
- **Rate Limit Entries**: Active rate limit entries
- **Configuration**: Current security settings
- **Performance**: Rate limit cleanup frequency

## 🚨 Incident Response

### Automated Responses
1. **Rate Limiting**: Automatic blocking of excessive activity
2. **Content Filtering**: Immediate blocking of suspicious content
3. **User Blocking**: Manual blocking of problematic users
4. **Logging**: All incidents logged for analysis

### Manual Actions
1. **User Blocking**: Administrators can block users
2. **User Unblocking**: Administrators can unblock users
3. **Log Review**: Security logs available for review
4. **Configuration Updates**: Security settings can be adjusted

## 📊 Security Metrics

### Current Limits
- **Message Length**: 200 characters maximum
- **Username Length**: 20 characters maximum
- **Rate Limit Window**: 120 seconds (2 minutes)
- **Message Rate**: 50 messages per 2 minutes (25 per minute average)
- **Reaction Rate**: 20 reactions per minute
- **Log Retention**: 100 most recent events

### Performance Impact
- **Validation Overhead**: <1ms per message
- **Rate Limit Check**: <1ms per action
- **Log Storage**: <1KB per event
- **Memory Usage**: <1MB for security module

## 🔧 Configuration

### Security Settings
```javascript
{
  maxMessageLength: 200,
  maxUsernameLength: 20,
  rateLimitWindow: 120000, // 2 minutes
  maxMessagesPerWindow: 50,
  maxReactionsPerWindow: 20
}
```

### Blocked Patterns
- XSS patterns: 6 regex patterns
- SQL injection: 3 regex patterns
- Command injection: 2 regex patterns
- Scam patterns: 8 regex patterns
- Social media: 6 regex patterns

## 📝 Best Practices

### For Users
1. **Use Strong Usernames**: Avoid easily guessable names
2. **Report Suspicious Activity**: Contact support for violations
3. **Keep Extension Updated**: Install latest security patches
4. **Review Permissions**: Understand what data is accessed

### For Developers
1. **Regular Security Reviews**: Monthly security assessments
2. **Pattern Updates**: Update blocked patterns as needed
3. **Log Analysis**: Monitor security logs for trends
4. **User Feedback**: Address user security concerns

## 🆘 Support

### Security Issues
- **Report Violations**: Use in-app reporting
- **Contact Support**: Email security@phantomview.com
- **Emergency Blocking**: Immediate user blocking available
- **Log Access**: Security logs available for review

### Privacy Concerns
- **Data Collection**: Minimal data collection policy
- **Data Retention**: Temporary data only
- **User Control**: Full user control over data
- **Transparency**: Open security documentation

## 📅 Version History

### v0.8.7 (Current)
- ✅ Input validation and sanitization
- ✅ Rate limiting implementation
- ✅ Content filtering system
- ✅ User blocking functionality
- ✅ Security event logging
- ✅ Firebase data protection

### Planned Features
- 🔄 Message encryption (optional)
- 🔄 Advanced spam detection
- 🔄 Machine learning pattern recognition
- 🔄 Real-time threat detection
- 🔄 Enhanced user reporting system

---

**Last Updated**: December 2024  
**Version**: 0.8.7  
**Security Level**: High  
**Compliance**: Chrome Web Store Guidelines