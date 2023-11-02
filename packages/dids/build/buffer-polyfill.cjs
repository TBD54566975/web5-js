/* eslint-disable @typescript-eslint/no-var-requires */
const polyfilledBuffer = require('buffer/').Buffer;
const { Buffer } = require('buffer');

// monkeypatch writeBigUInt64BE in polyfill bc its borked
// can remove this if/when this PR is merged: https://github.com/feross/buffer/pull/280
polyfilledBuffer.prototype.writeBigUInt64BE = Buffer.prototype.writeBigUInt64BE;
globalThis.Buffer = polyfilledBuffer;
