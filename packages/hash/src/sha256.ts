import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { SDJWTException } from '@bcrl/sd-jwt-util';

export const sha256 = (text: string): Uint8Array => {
  const uint8Array = toUTF8Array(text);
  const hashBytes = nobleSha256(uint8Array);
  return hashBytes;
};

export const hasher = (data: string, algorithm: string) => {
  if (toCryptoAlg(algorithm) !== 'sha256') {
    throw new SDJWTException('Not implemented');
  }
  return sha256(data);
};

const toCryptoAlg = (hashAlg: string): string =>
  // To cover sha-256, sha256, SHA-256, SHA256
  hashAlg.replace('-', '').toLowerCase();

function toUTF8Array(str: string) {
  const utf8: Array<number> = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f),
      );
    }
    // surrogate pair
    else {
      i++;
      // UTF-16 encodes 0x10000-0x10FFFF by
      // subtracting 0x10000 and splitting the
      // 20 bits of 0x0-0xFFFFF into two halves
      charcode =
        0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f),
      );
    }
  }
  return new Uint8Array(utf8);
}
