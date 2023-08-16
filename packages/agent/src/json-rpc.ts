export type JsonRpcId = string | number | null;
export type JsonRpcParams = any;
export type JsonRpcVersion = '2.0';

export interface JsonRpcRequest {
  jsonrpc: JsonRpcVersion;
  id?: JsonRpcId;
  method: string;
  params?: any;
}

export interface JsonRpcError {
  code: JsonRpcErrorCodes;
  message: string;
  data?: any;
}

export enum JsonRpcErrorCodes {
  // JSON-RPC 2.0 pre-defined errors
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ParseError = -32700,
  TransportError = -32300,

  // App defined errors
  BadRequest = -50400, // equivalent to HTTP Status 400
  Unauthorized = -50401, // equivalent to HTTP Status 401
  Forbidden = -50403, // equivalent to HTTP Status 403
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export interface JsonRpcSuccessResponse {
  jsonrpc: JsonRpcVersion;
  id: JsonRpcId;
  result: any;
  error?: never;
}

export interface JsonRpcErrorResponse {
  jsonrpc: JsonRpcVersion;
  id: JsonRpcId;
  result?: never;
  error: JsonRpcError;
}

export const createJsonRpcErrorResponse = (
  id: JsonRpcId,
  code: JsonRpcErrorCodes,
  message: string,
  data?: any,
): JsonRpcErrorResponse => {
  const error: JsonRpcError = { code, message };
  if (data != undefined) {
    error.data = data;
  }
  return {
    jsonrpc: '2.0',
    id,
    error,
  };
};

export const createJsonRpcNotification = (
  method: string,
  params?: JsonRpcParams,
): JsonRpcRequest => {
  return {
    jsonrpc: '2.0',
    method,
    params,
  };
};

export const createJsonRpcRequest = (
  id: JsonRpcId,
  method: string,
  params?: JsonRpcParams,
): JsonRpcRequest => {
  return {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };
};

export const createJsonRpcSuccessResponse = (
  id: JsonRpcId,
  result?: any,
): JsonRpcSuccessResponse => {
  return {
    jsonrpc : '2.0',
    id,
    result  : result ?? null,
  };
};

export function parseJson(text: string): object | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}