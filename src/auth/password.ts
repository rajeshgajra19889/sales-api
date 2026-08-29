import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(_scrypt);
const KEY_LEN = 64;

export async function hashPassword(plain: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(plain, salt, KEY_LEN)) as Buffer;
    return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const derived = (await scrypt(plain, salt, KEY_LEN)) as Buffer;
    const expected = Buffer.from(hash, 'hex');
    return derived.length === expected.length && timingSafeEqual(derived, expected);
}