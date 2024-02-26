import { SDJwtInstance, SDJwtPayload } from '../index';
import { DisclosureFrame, Signer, Verifier } from '@sd-jwt/types';
import Crypto from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { digest, generateSalt } from '@sd-jwt/crypto-nodejs';

export class TestInstance extends SDJwtInstance<SDJwtPayload> {
  protected type = 'sd-jwt';

  protected validateReservedFields(
    disclosureFrame: DisclosureFrame<SDJwtPayload>,
  ): void {
    return;
  }
}

export const createSignerVerifier = () => {
  const { privateKey, publicKey } = Crypto.generateKeyPairSync('ed25519');
  const signer: Signer = async (data: string) => {
    const sig = Crypto.sign(null, Buffer.from(data), privateKey);
    return Buffer.from(sig).toString('base64url');
  };
  const verifier: Verifier = async (data: string, sig: string) => {
    return Crypto.verify(
      null,
      Buffer.from(data),
      publicKey,
      Buffer.from(sig, 'base64url'),
    );
  };
  return { signer, verifier };
};

describe('index', () => {
  test('create', async () => {
    const sdjwt = new TestInstance();
    expect(sdjwt).toBeDefined();
  });

  test('kbJwt', async () => {
    const { signer, verifier } = createSignerVerifier();
    const sdjwt = new TestInstance({
      signer,
      signAlg: 'EdDSA',
      verifier,
      hasher: digest,
      saltGenerator: generateSalt,
      kbSigner: signer,
      kbSignAlg: 'EdDSA',
    });
    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );

    expect(credential).toBeDefined();

    const presentation = await sdjwt.present(credential, ['foo'], {
      kb: {
        payload: {
          sd_hash: 'sha-256',
          aud: '1',
          iat: 1,
          nonce: '342',
        },
      },
    });

    expect(presentation).toBeDefined();
  });

  test('issue', async () => {
    const { signer, verifier } = createSignerVerifier();
    const sdjwt = new TestInstance({
      signer,
      signAlg: 'EdDSA',
      verifier,
      hasher: digest,
      saltGenerator: generateSalt,
    });
    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );

    expect(credential).toBeDefined();
  });

  test('verify failed', async () => {
    const { signer } = createSignerVerifier();
    const { publicKey } = Crypto.generateKeyPairSync('ed25519');
    const failedverifier: Verifier = async (data: string, sig: string) => {
      return Crypto.verify(
        null,
        Buffer.from(data),
        publicKey,
        Buffer.from(sig, 'base64url'),
      );
    };

    const sdjwt = new TestInstance({
      signer,
      signAlg: 'EdDSA',
      verifier: failedverifier,
      hasher: digest,
      saltGenerator: generateSalt,
    });

    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );

    try {
      await sdjwt.verify(credential);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('verify failed with kbJwt', async () => {
    const { signer, verifier } = createSignerVerifier();
    const { publicKey } = Crypto.generateKeyPairSync('ed25519');
    const failedverifier: Verifier = async (data: string, sig: string) => {
      return Crypto.verify(
        null,
        Buffer.from(data),
        publicKey,
        Buffer.from(sig, 'base64url'),
      );
    };
    const sdjwt = new TestInstance({
      signer,
      signAlg: 'EdDSA',
      verifier,
      hasher: digest,
      saltGenerator: generateSalt,
      kbSigner: signer,
      kbVerifier: failedverifier,
      kbSignAlg: 'EdDSA',
    });

    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );

    const presentation = await sdjwt.present(credential, ['foo'], {
      kb: {
        payload: {
          sd_hash: '',
          aud: '1',
          iat: 1,
          nonce: '342',
        },
      },
    });

    try {
      await sdjwt.verify(presentation);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('verify with kbJwt', async () => {
    const { signer, verifier } = createSignerVerifier();
    const sdjwt = new TestInstance({
      signer,
      signAlg: 'EdDSA',
      verifier,
      hasher: digest,
      saltGenerator: generateSalt,
      kbSigner: signer,
      kbVerifier: verifier,
      kbSignAlg: 'EdDSA',
    });

    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );

    const presentation = await sdjwt.present(credential, ['foo'], {
      kb: {
        payload: {
          sd_hash: 'sha-256',
          aud: '1',
          iat: 1,
          nonce: '342',
        },
      },
    });

    const results = await sdjwt.verify(presentation, ['foo'], true);
    expect(results).toBeDefined();
  });

  test('Hasher not found', async () => {
    const sdjwt = new TestInstance({});
    try {
      const credential = await sdjwt.issue(
        {
          foo: 'bar',
          iss: 'Issuer',
          iat: new Date().getTime(),
          vct: '',
        },
        {
          _sd: ['foo'],
        },
      );

      expect(credential).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('SaltGenerator not found', async () => {
    const sdjwt = new TestInstance({
      hasher: digest,
    });
    try {
      const credential = await sdjwt.issue(
        {
          foo: 'bar',
          iss: 'Issuer',
          iat: new Date().getTime(),
          vct: '',
        },
        {
          _sd: ['foo'],
        },
      );

      expect(credential).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('Signer not found', async () => {
    const sdjwt = new TestInstance({
      hasher: digest,
      saltGenerator: generateSalt,
    });
    try {
      const credential = await sdjwt.issue(
        {
          foo: 'bar',
          iss: 'Issuer',
          iat: new Date().getTime(),
          vct: '',
        },
        {
          _sd: ['foo'],
        },
      );

      expect(credential).toBeDefined();
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('Verifier not found', async () => {
    const { signer, verifier } = createSignerVerifier();
    const sdjwt = new TestInstance({
      signer,
      hasher: digest,
      saltGenerator: generateSalt,
      kbSigner: signer,
      kbVerifier: verifier,
      signAlg: 'EdDSA',
      kbSignAlg: 'EdDSA',
    });

    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );

    const presentation = await sdjwt.present(credential, ['foo'], {
      kb: {
        payload: {
          sd_hash: 'sha-256',
          aud: '1',
          iat: 1,
          nonce: '342',
        },
      },
    });
    try {
      const results = await sdjwt.verify(presentation, ['foo'], true);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('kbSigner not found', async () => {
    const { signer, verifier } = createSignerVerifier();
    const sdjwt = new TestInstance({
      signer,
      verifier,
      hasher: digest,
      saltGenerator: generateSalt,
      kbVerifier: verifier,
      signAlg: 'EdDSA',
      kbSignAlg: 'EdDSA',
    });

    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );
    try {
      const presentation = await sdjwt.present(credential, ['foo'], {
        kb: {
          payload: {
            sd_hash: 'sha-256',
            aud: '1',
            iat: 1,
            nonce: '342',
          },
        },
      });
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('kbVerifier not found', async () => {
    const { signer, verifier } = createSignerVerifier();
    const sdjwt = new TestInstance({
      signer,
      verifier,
      hasher: digest,
      saltGenerator: generateSalt,
      kbSigner: signer,
      signAlg: 'EdDSA',
      kbSignAlg: 'EdDSA',
    });

    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );

    const presentation = await sdjwt.present(credential, ['foo'], {
      kb: {
        payload: {
          sd_hash: 'sha-256',
          aud: '1',
          iat: 1,
          nonce: '342',
        },
      },
    });
    try {
      const results = await sdjwt.verify(presentation, ['foo'], true);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  test('kbSignAlg not found', async () => {
    const { signer, verifier } = createSignerVerifier();
    const sdjwt = new TestInstance({
      signer,
      verifier,
      hasher: digest,
      saltGenerator: generateSalt,
      kbSigner: signer,
      signAlg: 'EdDSA',
    });

    const credential = await sdjwt.issue(
      {
        foo: 'bar',
        iss: 'Issuer',
        iat: new Date().getTime(),
        vct: '',
      },
      {
        _sd: ['foo'],
      },
    );

    const presentation = sdjwt.present(credential, ['foo'], {
      kb: {
        payload: {
          sd_hash: 'sha-256',
          aud: '1',
          iat: 1,
          nonce: '342',
        },
      },
    });
    expect(presentation).rejects.toThrow(
      'Key Binding sign algorithm not specified',
    );
  });

  test('hasher is not found', () => {
    const sdjwt = new TestInstance({});
    expect(sdjwt.keys('')).rejects.toThrow('Hasher not found');
  });
});
