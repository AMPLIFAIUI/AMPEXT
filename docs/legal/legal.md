# Legal & Privacy - AMP (Auto Memory Persistence)

## Copyright & Ownership

- **© 2025 AMPIQ. All rights reserved.**
- **Product**: AMP (Auto Memory Persistence) - Infinite Context Engine
- **Developer**: AMPIQ
- **Version**: Production Release
- **Architecture**: Dual Zipper Memory System with Fork System Routing

## License Information

### Commercial Licensing
- **License enforcement required for commercial usage**
- **Enterprise deployment requires valid license key**
- **License validation implemented in server/license.js**
- **Commercial use defined as:**
  - Business/organizational deployment
  - Revenue-generating activities
  - Multi-user environments
  - Integration with commercial products

### Open Source Components
- **Core architecture**: Proprietary AMPIQ technology
- **Dependencies**: Standard web technologies (Chrome Extensions API, Web Crypto API)
- **Third-party libraries**: Minimal dependencies for security
- **License compatibility**: MIT License compatible for non-commercial use

## Privacy & Data Protection

### Data Collection Policy
- **No personal data collected unless explicitly configured by user**
- **All data processing occurs locally on user's device**
- **No server-side data storage or transmission**
- **No analytics or tracking mechanisms**

### Data Storage & Encryption
- **AES-256-GCM encryption**: Military-grade encryption for all sensitive data
- **On-capture encryption**: Data encrypted immediately when leaving page
- **Zero plaintext retention**: No unencrypted data stored anywhere
- **On-demand decryption**: Data only decrypted when explicitly needed
- **Key rotation**: Automatic encryption key rotation for security

### Storage Locations
- **Primary**: Chrome Extension Storage (chrome.storage.local)
- **Overflow**: Desktop app local storage (~/.ampiq/storage/)
- **Memory**: Encrypted in-memory processing
- **Cross-platform**: Windows, macOS, Linux support

### Data Types Handled
- **Conversation content**: AI provider conversations
- **Context data**: Cross-provider context information
- **Metadata**: Timestamps, provider information, topic classification
- **System data**: Performance metrics, error logs, configuration

## Security Implementation

### Encryption Standards
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key derivation**: PBKDF2 with user-provided salt
- **Key management**: Secure key generation and rotation
- **Implementation**: Web Crypto API (crypto.subtle)

### Security Features
- **On-capture encryption**: Immediate encryption of all data
- **No plaintext storage**: Zero unencrypted data retention
- **Secure key handling**: Keys never stored in plaintext
- **Memory protection**: Encrypted memory pools
- **Crash safety**: Encrypted persistence across sessions

### Privacy Protection
- **Local-only processing**: All data stays on user's device
- **No network transmission**: No data sent to external servers
- **User control**: Complete control over data storage and deletion
- **Transparency**: Open source code for security verification

## Compliance & Regulations

### GDPR Compliance
- **Data minimization**: Only necessary data collected
- **User consent**: Explicit user configuration required
- **Right to deletion**: Complete data removal capabilities
- **Data portability**: Export functionality provided
- **Local processing**: No cross-border data transfer

### Enterprise Security
- **SOC 2 compatibility**: Security controls implemented
- **Zero-trust architecture**: No implicit trust assumptions
- **Audit logging**: Comprehensive system activity logging
- **Access controls**: User-based permission system
- **Incident response**: Automated error recovery mechanisms

### Industry Standards
- **OWASP compliance**: Web application security standards
- **NIST guidelines**: Cybersecurity framework alignment
- **ISO 27001**: Information security management
- **PCI DSS**: Payment card industry standards (if applicable)

## Technical Architecture

### System Components
- **Browser Extension**: Chrome/Edge extension for data capture
- **Desktop Application**: Native app for overflow storage
- **Memory Pool**: 5x1MB hot memory system
- **Dual Zipper**: Fat zipper (full data) + Thin zipper (compressed tags)
- **Fork System**: Intelligent data routing and processing

### Data Flow
- **Capture**: Real-time conversation monitoring
- **Processing**: Intelligent content analysis and compression
- **Storage**: Encrypted local storage with overflow management
- **Retrieval**: Fast search and context injection
- **Archival**: Automatic cold storage management

## User Rights & Responsibilities

### User Rights
- **Data ownership**: Complete ownership of all captured data
- **Access control**: Full control over data access and usage
- **Deletion rights**: Complete data removal capabilities
- **Export rights**: Data export in standard formats
- **Privacy**: No unauthorized data access or sharing

### User Responsibilities
- **License compliance**: Valid license for commercial use
- **Security**: Maintain secure encryption keys
- **Updates**: Keep system updated for security patches
- **Backup**: Regular data backup and recovery procedures
- **Compliance**: Adhere to applicable data protection regulations

## Support & Maintenance

### Technical Support
- **Documentation**: Comprehensive technical documentation
- **Error handling**: Robust error recovery and troubleshooting
- **Performance monitoring**: Real-time system health tracking
- **Update mechanism**: Automatic security and feature updates

### Maintenance
- **Regular updates**: Security patches and feature enhancements
- **Compatibility**: Browser and platform compatibility maintenance
- **Performance optimization**: Continuous performance improvements
- **Security audits**: Regular security assessments and updates

## Disclaimers

### Software Warranty
- **"As-is" basis**: Software provided without warranties
- **No guarantee**: No guarantee of fitness for specific purposes
- **User responsibility**: Users responsible for data backup and security
- **Limitation of liability**: Limited liability for data loss or system failures

### Third-party Services
- **AI providers**: No control over third-party AI service providers
- **Browser compatibility**: Dependent on browser extension APIs
- **Platform support**: Limited to supported operating systems
- **Network dependencies**: May require internet connectivity for AI services

## Contact Information

### Legal Inquiries
- **Copyright**: copyright@ampiq.com
- **Licensing**: licensing@ampiq.com
- **Privacy**: privacy@ampiq.com
- **Security**: security@ampiq.com

### Technical Support
- **Documentation**: docs.ampiq.com
- **Issues**: github.com/ampiq/amp/issues
- **Community**: community.ampiq.com

---

**Last Updated**: January 2025
**Version**: 1.0
**Applicable Law**: International copyright and data protection laws
