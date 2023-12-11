import { Request, Response } from 'express';
import { VerifiableCredential } from '@web5/credentials';
import { DidKeyMethod } from '@web5/dids';
import { paths } from './openapi.js';

export async function credentialIssue(req: Request, res: Response) {
  const body: paths["/credentials/issue"]["post"]["requestBody"]["content"]["application/json"] =
  req.body;

  const ownDid = await DidKeyMethod.create();

  const vc: VerifiableCredential = await VerifiableCredential.create({
    type: body.credential.type[body.credential.type.length - 1],
    issuer: body.credential.issuer,
    subject: body.credential.credentialSubject["id"] as string,
    data: body.credential.credentialSubject
  });

  const vcJwt: string = await vc.sign({did: ownDid});

  const resp: paths["/credentials/issue"]["post"]["responses"]["200"]["content"]["application/json"] =
      {
        verifiableCredential: {data: vcJwt}
      };

  res.json(resp);
}