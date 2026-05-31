const ALGO = 'AES-GCM'
const KEY_LENGTH = 256
const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16
const IV_LENGTH = 12

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  /** Base64-encoded salt */
  s: string
  /** Base64-encoded IV */
  i: string
  /** Base64-encoded ciphertext */
  d: string
}

/**
 * Encrypt a plaintext string using a password.
 * Returns a compact JSON-serializable payload.
 */
export async function encrypt(plaintext: string, password: string): Promise<EncryptedPayload> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt.buffer)
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoder.encode(plaintext))
  return {
    s: toBase64(salt.buffer),
    i: toBase64(iv.buffer),
    d: toBase64(ciphertext),
  }
}

/**
 * Decrypt an encrypted payload using the password.
 */
export async function decrypt(payload: EncryptedPayload, password: string): Promise<string> {
  const salt = fromBase64(payload.s)
  const iv = fromBase64(payload.i)
  const ciphertext = fromBase64(payload.d)
  const key = await deriveKey(password, salt)
  const plainBuffer = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext)
  return new TextDecoder().decode(plainBuffer)
}

/**
 * Check if a value looks like an encrypted payload (has s, i, d fields).
 */
export function isEncryptedPayload(val: unknown): val is EncryptedPayload {
  if (val === null || typeof val !== 'object') return false
  const obj = val as Record<string, unknown>
  return (
    typeof obj.s === 'string' &&
    typeof obj.i === 'string' &&
    typeof obj.d === 'string'
  )
}
