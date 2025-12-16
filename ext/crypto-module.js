// AMP Crypto Module - Secure encryption using Web Crypto API
// Replaces weak XOR/Base64 with proper AES-GCM encryption

class AMPCrypto {
  constructor() {
    this.key = null;
    this.keyRotationInterval = null;
    this.initPromise = this.initialize();
  }
  
  async initialize() {
    await this.generateKey();
    this.startKeyRotation();
  }
  
  async generateKey() {
    this.key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  startKeyRotation() {
    this.keyRotationInterval = setInterval(async () => {
      await this.generateKey();
      console.log('[AMP Crypto] Key rotated');
    }, 10 * 60 * 1000); // 10 minutes
  }
  
  async encrypt(data) {
    await this.initPromise;
    
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(text);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.key,
        dataBuffer
      );
      
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);
      
      return this.arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error('[AMP Crypto] Encryption failed:', error);
      return null;
    }
  }
  
  async decrypt(encryptedData) {
    await this.initPromise;
    
    try {
      if (!encryptedData) return null;
      
      const combined = this.base64ToArrayBuffer(encryptedData);
      const combinedArray = new Uint8Array(combined);
      
      const iv = combinedArray.slice(0, 12);
      const ciphertext = combinedArray.slice(12);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        this.key,
        ciphertext
      );
      
      const decoder = new TextDecoder();
      const text = decoder.decode(decryptedBuffer);
      
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (error) {
      console.error('[AMP Crypto] Decryption failed:', error);
      return null;
    }
  }
  
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  destroy() {
    if (this.keyRotationInterval) {
      clearInterval(this.keyRotationInterval);
      this.keyRotationInterval = null;
    }
    this.key = null;
  }
}

const ampCrypto = new AMPCrypto();
