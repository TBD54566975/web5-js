import express from "express";
import { credentialIssue } from "./credentials.js";
import { didIonCreate } from "./did-ion.js";
import {
  encoderBase64Decode,
  encoderBase64Encode,
  encoderSha256Encode,
} from "./encoders.js";
import type * as http from "http";
import type { Request, Response } from "express";
import { paths } from "./openapi.js"; // generated with npx openapi-typescript .web5-component/openapi.yaml -o .web5-component/openapi.d.ts
import bodyparser from "body-parser";

const app: express.Application = express();
app.use(express.json());
app.use(bodyparser.json());

app.post("/did-ion/create", didIonCreate);

app.post("/credentials/issue", credentialIssue);

app.post("/encoders/base64/encode", encoderBase64Encode);
app.post("/encoders/base64/decode", encoderBase64Decode);
app.post("/encoders/sha256/encode", encoderSha256Encode);

const serverID: paths["/"]["get"]["responses"]["200"]["content"]["application/json"] =
  {
    name: "web5-js",
    language: "JavaScript",
    url: "https://github.com/TBD54566975/web5-js",
  };
app.get("/", (req, res) => {
  res.json(serverID);
});

let server: http.Server;
app.get("/shutdown", (req: Request, res: Response) => {
  res.send("ok");
  console.log("shutting down server");
  server.close((e) => {
    if (e) {
      console.error("error shutting down server:", e.stack || e);
    }
  });
});

server = app.listen(8080, () => console.log("test server started"));
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
