# © 2025 AMPIQ All rights reserved.
# Simple config encryptor for vault / license settings
import json, os
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes

def pad(data):
    pad_len = 16 - len(data) % 16
    return data + chr(pad_len) * pad_len

key = os.urandom(32)
iv = get_random_bytes(16)

with open('config.json', 'r') as f:
    data = f.read()

cipher = AES.new(key, AES.MODE_CBC, iv)
enc = cipher.encrypt(pad(data).encode('utf-8'))

with open('config.enc', 'wb') as f:
    f.write(iv + enc)

print("Encrypted. Store your key securely.")
