---
"@web5/agent": patch
"@web5/identity-agent": patch
"@web5/proxy-agent": patch
"@web5/user-agent": patch
---

Extend and Test RPC DWN/Web5 Clients to support `http` and `ws`
- move `HttpDwnRpcClient` to `/prototyping` folder
- move `JSON RPC` related files to `/prototyping` folder
- create `WebSocketDwnRpcClient` in `/prototyping` folder
- create `WebSocketWeb5RpcClient` wrapper in `rpc-client`
  - does not support `sendDidRequest` via sockets

