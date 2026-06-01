import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, isEncryptedPayload, type EncryptedPayload } from './crypto'

describe('encrypt / decrypt roundtrip', () => {
  it('should encrypt and decrypt back to original plaintext', async () => {
    const plaintext = 'hello world'
    const password = 'my-secret-key'

    const payload = await encrypt(plaintext, password)
    const decrypted = await decrypt(payload, password)

    expect(decrypted).toBe(plaintext)
  })

  it('should handle empty string', async () => {
    const payload = await encrypt('', 'password')
    const decrypted = await decrypt(payload, 'password')
    expect(decrypted).toBe('')
  })

  it('should handle unicode characters', async () => {
    const plaintext = '你好世界 🌍 émojis café'
    const payload = await encrypt(plaintext, 'password')
    const decrypted = await decrypt(payload, 'password')
    expect(decrypted).toBe(plaintext)
  })

  it('should handle long strings', async () => {
    const plaintext = 'a'.repeat(10000)
    const payload = await encrypt(plaintext, 'password')
    const decrypted = await decrypt(payload, 'password')
    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertext each time (random salt + IV)', async () => {
    const plaintext = 'same input'
    const password = 'same-password'

    const payload1 = await encrypt(plaintext, password)
    const payload2 = await encrypt(plaintext, password)

    // Different salt/IV → different ciphertext
    expect(payload1.d).not.toBe(payload2.d)
    expect(payload1.s).not.toBe(payload2.s)
    expect(payload1.i).not.toBe(payload2.i)

    // But both decrypt to the same value
    expect(await decrypt(payload1, password)).toBe(plaintext)
    expect(await decrypt(payload2, password)).toBe(plaintext)
  })

  it('should fail to decrypt with wrong password', async () => {
    const payload = await encrypt('secret', 'correct-password')
    await expect(decrypt(payload, 'wrong-password')).rejects.toThrow()
  })

  it('should produce a valid EncryptedPayload structure', async () => {
    const payload = await encrypt('test', 'key')

    expect(payload).toHaveProperty('s')
    expect(payload).toHaveProperty('i')
    expect(payload).toHaveProperty('d')
    expect(typeof payload.s).toBe('string')
    expect(typeof payload.i).toBe('string')
    expect(typeof payload.d).toBe('string')

    // Base64 encoded - should be decodable
    expect(() => atob(payload.s)).not.toThrow()
    expect(() => atob(payload.i)).not.toThrow()
    expect(() => atob(payload.d)).not.toThrow()
  })
})

describe('isEncryptedPayload', () => {
  it('should return true for valid payload', () => {
    const payload: EncryptedPayload = { s: 'abc', i: 'def', d: 'ghi' }
    expect(isEncryptedPayload(payload)).toBe(true)
  })

  it('should return true for empty strings (structurally valid)', () => {
    expect(isEncryptedPayload({ s: '', i: '', d: '' })).toBe(true)
  })

  it('should return false for null', () => {
    expect(isEncryptedPayload(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isEncryptedPayload(undefined)).toBe(false)
  })

  it('should return false for non-object types', () => {
    expect(isEncryptedPayload('string')).toBe(false)
    expect(isEncryptedPayload(42)).toBe(false)
    expect(isEncryptedPayload(true)).toBe(false)
  })

  it('should return false when missing fields', () => {
    expect(isEncryptedPayload({ s: 'a', i: 'b' })).toBe(false)
    expect(isEncryptedPayload({ s: 'a', d: 'b' })).toBe(false)
    expect(isEncryptedPayload({ i: 'a', d: 'b' })).toBe(false)
    expect(isEncryptedPayload({})).toBe(false)
  })

  it('should return false when fields are not strings', () => {
    expect(isEncryptedPayload({ s: 123, i: 'a', d: 'b' })).toBe(false)
    expect(isEncryptedPayload({ s: 'a', i: null, d: 'b' })).toBe(false)
  })
})
