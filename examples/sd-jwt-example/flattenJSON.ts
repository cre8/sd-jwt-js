import { FlattenJSON, SDJwtInstance } from '@sd-jwt/core';
import type { DisclosureFrame } from '@sd-jwt/types';
import { createSignerVerifier, digest, generateSalt, ES256 } from './utils';

(async () => {
  const { signer, verifier } = await createSignerVerifier();

  // Create SDJwt instance for use
  const sdjwt = new SDJwtInstance({
    signer,
    signAlg: ES256.alg,
    verifier,
    hasher: digest,
    saltGenerator: generateSalt,
    kbSigner: signer,
    kbSignAlg: ES256.alg,
    kbVerifier: verifier,
  });
  const claims = {
    firstname: 'John',
    lastname: 'Doe',
    ssn: '123-45-6789',
    id: '1234',
  };
  const disclosureFrame: DisclosureFrame<typeof claims> = {
    _sd: ['firstname', 'id'],
  };

  const kbPayload = {
    iat: Math.floor(Date.now() / 1000),
    aud: 'https://example.com',
    nonce: '1234',
    custom: 'data',
  };

  const encodedSdjwt = await sdjwt.issue(claims, disclosureFrame);
  console.log('encodedSdjwt:', encodedSdjwt);

  const flattenJSON = FlattenJSON.fromEncode(encodedSdjwt);
  console.log('flattenJSON(credential): ', flattenJSON.toJson());

  const presentedSdJwt = await sdjwt.present<typeof claims>(
    encodedSdjwt,
    { id: true },
    {
      kb: {
        payload: kbPayload,
      },
    },
  );

  const flattenPresentationJSON = FlattenJSON.fromEncode(presentedSdJwt);
  console.log('flattenJSON(presentation): ', flattenPresentationJSON.toJson());

  const verified = await sdjwt.verify(presentedSdJwt, {
    requiredClaimKeys: ['firstname', 'id'],
    keyBindingNonce: '1234',
  });
  console.log(verified);
})();
