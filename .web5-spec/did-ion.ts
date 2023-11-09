import { DidIonMethod } from "@web5/dids";
import { paths } from "./openapi.js";
import { Request, Response } from "express";


export async function didIonCreate(req: Request, res: Response) {
  // const body: paths["/did-ion/create"]["post"]["requestBody"]["content"]["application/json"] =
  //   req.body;
  const did = await DidIonMethod.create({});

  const resp: paths["/did-ion/create"]["post"]["responses"]["200"]["content"]["application/json"] =
    {
      did: did.did,
    };

  res.json(resp);
}
