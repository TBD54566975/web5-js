// Test vector source: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
// Credit for adaptation to JavaScript: https://github.com/ethereum/js-ethereum-cryptography/blob/master/test/test-vectors/aes.ts
export const aesCtrTestVectors = [
  {
    id         : 'NIST F.5.1',
    counter    : 'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff',
    data       : '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710',
    key        : '2b7e151628aed2a6abf7158809cf4f3c',
    length     : 128,
    ciphertext : '874d6191b620e3261bef6864990db6ce9806f66b7970fdff8617187bb9fffdff5ae4df3edbd5d35e5b4f09020db03eab1e031dda2fbe03d1792170a0f3009cee'
  },
  {
    id         : 'jec.1',
    counter    : 'ffffffffffffffffffffffffffffffff',
    data       : 'efca4cdd31923b50f4214af5d2ae10e7ac45a5019e9431cc195482d707485378',
    key        : 'ccc0b35ea59c51a1e45af00502966237',
    length     : 128,
    ciphertext : '15e356c67d266d3ca85cff4f6d92d11720aae32cdd28d5d9885836dacb1d213b'
  },
  {
    id         : 'jec.2',
    counter    : 'ffffffffffffffffffffffffffffffff',
    data       : 'efca4cdd31923b50f4214af5d2ae10e7ac45a5019e9431cc195482d707485378',
    key        : 'ccc0b35ea59c51a1e45af00502966237ccc0b35ea59c51a1e45af00502966237',
    length     : 128,
    ciphertext : '010bb6dc10ea201bf2d586de4741309373c07b6ddf30ad8502adf4dd0bda2d23'
  },
  {
    id         : 'jec.3',
    counter    : 'ffffffffffffffffffffffffffffffff',
    data       : 'efca4cdd31923b50f4214af5d2ae10e7ac45a5019e9431cc195482d707485378efca4cdd31923b50f4214af5d2ae10e7ac45a5019e9431cc195482d707485378',
    key        : 'ccc0b35ea59c51a1e45af00502966237',
    length     : 128,
    ciphertext : '15e356c67d266d3ca85cff4f6d92d11720aae32cdd28d5d9885836dacb1d213b55f347e68f72acf46234d495f579fb45f9dcfc7dc688a9174f566d137ffc626c'
  },
  {
    id         : 'jec.4',
    counter    : 'ffffffffffffffffffffffffffffffff',
    data       : 'efca4cdd31923b50f4214af5d2ae10e7ac45a5019e9431cc195482d707485378efca4cdd31923b50f4214af5d2ae10e7ac45a5019e9431cc195482d707485378',
    key        : 'ccc0b35ea59c51a1e45af00502966237ccc0b35ea59c51a1e45af00502966237',
    length     : 128,
    ciphertext : '010bb6dc10ea201bf2d586de4741309373c07b6ddf30ad8502adf4dd0bda2d23c436b35e5dfa0a0088dcb6ae7328f1ec66212099222ee1c18983b58513cf5f4c'
  }
];