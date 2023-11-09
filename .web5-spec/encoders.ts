import { paths } from "./openapi.js";
import { Request, Response } from "express";
import { Convert } from "@web5/common";
import { sha256 } from "@noble/hashes/sha256";

export function encoderBase64Encode(req: Request, res: Response) {
  const requestBody: paths["/encoders/base64/encode"]["post"]["requestBody"]["content"]["application/json"] =
    req.body;

  const resp: paths["/encoders/base64/encode"]["post"]["responses"]["200"]["content"]["application/json"] =
    {
      data: Convert.string(requestBody.data).toBase64Url(),
    };

  res.json(resp);
}

export function encoderBase64Decode(req: Request, res: Response) {
  const requestBody: paths["/encoders/base64/encode"]["post"]["requestBody"]["content"]["application/json"] =
    req.body;

  const resp: paths["/encoders/base64/encode"]["post"]["responses"]["200"]["content"]["application/json"] =
    {
      data: Convert.base64Url(requestBody.data).toString(),
    };

  res.json(resp);
}

export function encoderSha256Encode(req: Request, res: Response) {
  const requestBody: paths["/encoders/sha256/encode"]["post"]["requestBody"]["content"]["application/json"] =
    req.body;

  const resp: paths["/encoders/sha256/encode"]["post"]["responses"]["200"]["content"]["application/json"] =
    {
      data: Convert.arrayBuffer(sha256(requestBody.data)).toHex(),
    };

  res.json(resp);
}
