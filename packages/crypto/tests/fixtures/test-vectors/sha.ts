// FIPS 180-2 - Secure Hash Standard
// Test vector source: https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/SHA256.pdf
export const sha256TestVectors = [
  {
    id     : 'nist.fips180-2.1',
    input  : 'abc',
    output : 'ba7816bf 8f01cfea 414140de 5dae2223 b00361a3 96177a9c b410ff61 f20015ad'
  },
  {
    id     : 'nist.fips180-2.2',
    input  : '',
    output : 'e3b0c442 98fc1c14 9afbf4c8 996fb924 27ae41e4 649b934c a495991b 7852b855'
  },
  {
    id     : 'nist.fips180-2.3',
    input  : 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    output : '248d6a61 d20638b8 e5c02693 0c3e6039 a33ce459 64ff2167 f6ecedd4 19db06c1'
  },
  {
    id     : 'nist.fips180-2.4',
    input  : 'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu',
    output : 'cf5b16a7 78af8380 036ce59e 7b049237 0b249b11 e8f07a51 afac4503 7afee9d1'
  }
];