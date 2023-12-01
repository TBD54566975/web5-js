import { Request, Response } from 'express';
import { VerifiableCredential, SignOptions } from '@web5/credentials';
import { DidKeyMethod, PortableDid } from '@web5/dids';
import { Ed25519, PrivateKeyJwk } from '@web5/crypto';
import { paths } from './openapi.js';

type Signer = (data: Uint8Array) => Promise<Uint8Array>;

let _ownDid: PortableDid;

async function getOwnDid(): Promise<PortableDid> {
    if(_ownDid) {
        return _ownDid;
    }
    _ownDid = await DidKeyMethod.create();
    return _ownDid;
}

export async function credentialIssue(req: Request, res: Response) {
  const body: paths["/credentials/issue"]["post"]["requestBody"]["content"]["application/json"] =
  req.body;

    const ownDid = await getOwnDid()

    // build signing options
    const [signingKeyPair] = ownDid.keySet.verificationMethodKeys!;
    const subjectIssuerDid = body.credential.credentialSubject["id"] as string;
    const signer = EdDsaSigner(signingKeyPair.privateKeyJwk as PrivateKeyJwk);
    const signOptions: SignOptions = {
        issuerDid  : ownDid.did,
        subjectDid : subjectIssuerDid,
        kid        : '#' + ownDid.did.split(':')[2],
        signer     : signer
    };

  const vc: VerifiableCredential = VerifiableCredential.create({
    type: body.credential.type[body.credential.type.length - 1],
    issuer: body.credential.issuer,
    subject: subjectIssuerDid,
    data: body.credential.credentialSubject
  });

  const vcJwt: string = await vc.sign(signOptions);

  const resp: paths["/credentials/issue"]["post"]["responses"]["200"]["content"]["application/json"] =
      {
        verifiableCredential: {data: vcJwt}
      };

  res.json(resp);
}

function EdDsaSigner(privateKey: PrivateKeyJwk): Signer {
    return async (data: Uint8Array): Promise<Uint8Array> => {
        const signature = await Ed25519.sign({ data, key: privateKey});
        return signature;
    };
}