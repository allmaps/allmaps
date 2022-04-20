import serialize from './checksum.js';
async function generateHash(str) {
    const hashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}
export async function generateId(str, length = 16) {
    const hash = await generateHash(String(str));
    return hash.slice(0, length);
}
export async function generateRandomId(length) {
    const uuid = crypto.randomUUID();
    const id = await generateId(uuid, length);
    return id;
}
export async function generateChecksum(obj, length) {
    const checksum = await generateId(serialize(obj), length);
    return checksum;
}
