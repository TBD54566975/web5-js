var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { base58btc } from 'multiformats/bases/base58';
import { base64url } from 'multiformats/bases/base64';
import { isAsyncIterable, isArrayBufferSlice, universalTypeOf } from './type-utils.js';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
export class Convert {
    constructor(data, format) {
        this.data = data;
        this.format = format;
    }
    static arrayBuffer(data) {
        return new Convert(data, 'ArrayBuffer');
    }
    static asyncIterable(data) {
        if (!isAsyncIterable(data)) {
            throw new TypeError('Input must be of type AsyncIterable.');
        }
        return new Convert(data, 'AsyncIterable');
    }
    static base58Btc(data) {
        return new Convert(data, 'Base58Btc');
    }
    static base64Url(data) {
        return new Convert(data, 'Base64Url');
    }
    /**
     * Reference:
     * The BufferSource type is a TypeScript type that represents an ArrayBuffer
     * or one of the ArrayBufferView types, such a TypedArray (e.g., Uint8Array)
     * or a DataView.
     */
    static bufferSource(data) {
        return new Convert(data, 'BufferSource');
    }
    static hex(data) {
        if (typeof data !== 'string') {
            throw new TypeError('Hex input must be a string.');
        }
        if (data.length % 2 !== 0) {
            throw new TypeError('Hex input must have an even number of characters.');
        }
        return new Convert(data, 'Hex');
    }
    static multibase(data) {
        return new Convert(data, 'Multibase');
    }
    static object(data) {
        return new Convert(data, 'Object');
    }
    static string(data) {
        return new Convert(data, 'String');
    }
    static uint8Array(data) {
        return new Convert(data, 'Uint8Array');
    }
    toArrayBuffer() {
        switch (this.format) {
            case 'Base58Btc': {
                return base58btc.baseDecode(this.data).buffer;
            }
            case 'Base64Url': {
                return base64url.baseDecode(this.data).buffer;
            }
            case 'BufferSource': {
                const dataType = universalTypeOf(this.data);
                if (dataType === 'ArrayBuffer') {
                    // Data is already an ArrayBuffer, No conversion is necessary.
                    return this.data;
                }
                else if (ArrayBuffer.isView(this.data)) {
                    // Data is a DataView or a different TypedArray (e.g., Uint16Array).
                    if (isArrayBufferSlice(this.data)) {
                        // Data is a slice of an ArrayBuffer. Return a new ArrayBuffer or ArrayBufferView of the same slice.
                        return this.data.buffer.slice(this.data.byteOffset, this.data.byteOffset + this.data.byteLength);
                    }
                    else {
                        // Data is a whole ArrayBuffer viewed as a different TypedArray or DataView. Return the whole ArrayBuffer.
                        return this.data.buffer;
                    }
                }
                else {
                    throw new TypeError(`${this.format} value is not of type: ArrayBuffer, DataView, or TypedArray.`);
                }
            }
            case 'Hex': {
                return this.toUint8Array().buffer;
            }
            case 'String': {
                return this.toUint8Array().buffer;
            }
            case 'Uint8Array': {
                return this.data.buffer;
            }
            default:
                throw new TypeError(`Conversion from ${this.format} to ArrayBuffer is not supported.`);
        }
    }
    toArrayBufferAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.format) {
                case 'AsyncIterable': {
                    const blob = yield this.toBlobAsync();
                    return yield blob.arrayBuffer();
                }
                default:
                    throw new TypeError(`Asynchronous conversion from ${this.format} to ArrayBuffer is not supported.`);
            }
        });
    }
    toBase58Btc() {
        switch (this.format) {
            case 'ArrayBuffer': {
                const u8a = new Uint8Array(this.data);
                return base58btc.baseEncode(u8a);
            }
            case 'Multibase': {
                return this.data.substring(1);
            }
            case 'Uint8Array': {
                return base58btc.baseEncode(this.data);
            }
            default:
                throw new TypeError(`Conversion from ${this.format} to Base58Btc is not supported.`);
        }
    }
    toBase64Url() {
        switch (this.format) {
            case 'ArrayBuffer': {
                const u8a = new Uint8Array(this.data);
                return base64url.baseEncode(u8a);
            }
            case 'BufferSource': {
                const u8a = this.toUint8Array();
                return base64url.baseEncode(u8a);
            }
            case 'Object': {
                const string = JSON.stringify(this.data);
                const u8a = textEncoder.encode(string);
                return base64url.baseEncode(u8a);
            }
            case 'String': {
                const u8a = textEncoder.encode(this.data);
                return base64url.baseEncode(u8a);
            }
            case 'Uint8Array': {
                return base64url.baseEncode(this.data);
            }
            default:
                throw new TypeError(`Conversion from ${this.format} to Base64Url is not supported.`);
        }
    }
    toBlobAsync() {
        var _a, e_1, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.format) {
                case 'AsyncIterable': {
                    // Initialize an array to hold the chunks from the AsyncIterable.
                    const chunks = [];
                    try {
                        // Asynchronously iterate over each chunk in the AsyncIterable.
                        for (var _d = true, _e = __asyncValues(this.data), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                            _c = _f.value;
                            _d = false;
                            const chunk = _c;
                            // Append each chunk to the chunks array. These chunks can be of any type, typically binary data or text.
                            chunks.push(chunk);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    // Create a new Blob from the aggregated chunks.
                    // The Blob constructor combines these chunks into a single Blob object.
                    const blob = new Blob(chunks);
                    return blob;
                }
                default:
                    throw new TypeError(`Asynchronous conversion from ${this.format} to Blob is not supported.`);
            }
        });
    }
    toHex() {
        // pre-calculating Hex values improves runtime by 6-10x.
        const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
        switch (this.format) {
            case 'ArrayBuffer': {
                const u8a = this.toUint8Array();
                return Convert.uint8Array(u8a).toHex();
            }
            case 'Base64Url': {
                const u8a = this.toUint8Array();
                return Convert.uint8Array(u8a).toHex();
            }
            case 'Uint8Array': {
                let hex = '';
                for (let i = 0; i < this.data.length; i++) {
                    hex += hexes[this.data[i]];
                }
                return hex;
            }
            default:
                throw new TypeError(`Conversion from ${this.format} to Hex is not supported.`);
        }
    }
    toMultibase() {
        switch (this.format) {
            case 'Base58Btc': {
                return `z${this.data}`;
            }
            default:
                throw new TypeError(`Conversion from ${this.format} to Multibase is not supported.`);
        }
    }
    toObject() {
        switch (this.format) {
            case 'Base64Url': {
                const u8a = base64url.baseDecode(this.data);
                const text = textDecoder.decode(u8a);
                return JSON.parse(text);
            }
            case 'String': {
                return JSON.parse(this.data);
            }
            case 'Uint8Array': {
                const text = textDecoder.decode(this.data);
                return JSON.parse(text);
            }
            default:
                throw new TypeError(`Conversion from ${this.format} to Object is not supported.`);
        }
    }
    toObjectAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.format) {
                case 'AsyncIterable': {
                    // Convert the AsyncIterable to a String.
                    const text = yield this.toStringAsync();
                    // Parse the string as JSON. This step assumes that the string represents a valid JSON structure.
                    // JSON.parse() will convert the string into a corresponding JavaScript object.
                    const json = JSON.parse(text);
                    // Return the parsed JavaScript object. The type of this object will depend on the structure
                    // of the JSON in the stream. It could be an object, array, string, number, etc.
                    return json;
                }
                default:
                    throw new TypeError(`Asynchronous conversion from ${this.format} to Object is not supported.`);
            }
        });
    }
    toString() {
        switch (this.format) {
            case 'ArrayBuffer': {
                return textDecoder.decode(this.data);
            }
            case 'Base64Url': {
                const u8a = base64url.baseDecode(this.data);
                return textDecoder.decode(u8a);
            }
            case 'Object': {
                return JSON.stringify(this.data);
            }
            case 'Uint8Array': {
                return textDecoder.decode(this.data);
            }
            default:
                throw new TypeError(`Conversion from ${this.format} to String is not supported.`);
        }
    }
    toStringAsync() {
        var _a, e_2, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.format) {
                case 'AsyncIterable': {
                    // Initialize an empty string to accumulate the decoded text.
                    let str = '';
                    try {
                        // Iterate over the chunks from the AsyncIterable.
                        for (var _d = true, _e = __asyncValues(this.data), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                            _c = _f.value;
                            _d = false;
                            const chunk = _c;
                            // If the chunk is already a string, concatenate it directly.
                            if (typeof chunk === 'string')
                                str += chunk;
                            else
                                // If the chunk is a Uint8Array or similar, use the decoder to convert it to a string.
                                // The `stream: true` option lets the decoder handle multi-byte characters spanning
                                // multiple chunks.
                                str += textDecoder.decode(chunk, { stream: true });
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                    // Finalize the decoding process to handle any remaining bytes and signal the end of the stream.
                    // The `stream: false` option flushes the decoder's internal state.
                    str += textDecoder.decode(undefined, { stream: false });
                    // Return the accumulated string.
                    return str;
                }
                default:
                    throw new TypeError(`Asynchronous conversion from ${this.format} to String is not supported.`);
            }
        });
    }
    toUint8Array() {
        switch (this.format) {
            case 'ArrayBuffer': {
                // Çreate Uint8Array as a view on the ArrayBuffer.
                // Note: The Uint8Array shares the same memory as the ArrayBuffer, so this operation is very efficient.
                return new Uint8Array(this.data);
            }
            case 'Base58Btc': {
                return base58btc.baseDecode(this.data);
            }
            case 'Base64Url': {
                return base64url.baseDecode(this.data);
            }
            case 'BufferSource': {
                const dataType = universalTypeOf(this.data);
                if (dataType === 'Uint8Array') {
                    // Data is already a Uint8Array. No conversion is necessary.
                    // Note: Uint8Array is a type of BufferSource.
                    return this.data;
                }
                else if (dataType === 'ArrayBuffer') {
                    // Data is an ArrayBuffer, create Uint8Array as a view on the ArrayBuffer.
                    // Note: The Uint8Array shares the same memory as the ArrayBuffer, so this operation is very efficient.
                    return new Uint8Array(this.data);
                }
                else if (ArrayBuffer.isView(this.data)) {
                    // Data is a DataView or a different TypedArray (e.g., Uint16Array).
                    return new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength);
                }
                else {
                    throw new TypeError(`${this.format} value is not of type: ArrayBuffer, DataView, or TypedArray.`);
                }
            }
            case 'Hex': {
                const u8a = new Uint8Array(this.data.length / 2);
                for (let i = 0; i < this.data.length; i += 2) {
                    const byteValue = parseInt(this.data.substring(i, i + 2), 16);
                    if (isNaN(byteValue)) {
                        throw new TypeError('Input is not a valid hexadecimal string.');
                    }
                    u8a[i / 2] = byteValue;
                }
                return u8a;
            }
            case 'Object': {
                const string = JSON.stringify(this.data);
                return textEncoder.encode(string);
            }
            case 'String': {
                return textEncoder.encode(this.data);
            }
            default:
                throw new TypeError(`Conversion from ${this.format} to Uint8Array is not supported.`);
        }
    }
    toUint8ArrayAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            switch (this.format) {
                case 'AsyncIterable': {
                    const arrayBuffer = yield this.toArrayBufferAsync();
                    return new Uint8Array(arrayBuffer);
                }
                default:
                    throw new TypeError(`Asynchronous conversion from ${this.format} to Uint8Array is not supported.`);
            }
        });
    }
}
//# sourceMappingURL=convert.js.map