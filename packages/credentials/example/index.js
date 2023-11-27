/** This is an example of how to use the web5/credentials package:  https://www.npmjs.com/package/@web5/credentials */

import { VerifiableCredential, PresentationExchange } from "@web5/credentials";
import { DidKeyMethod, utils as didUtils } from '@web5/dids';
import { Ed25519, Jose } from '@web5/crypto';
import { Web5 } from '@web5/api';

// From: https://developer.tbd.website/docs/web5/quickstart
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

/** 
 * Issue and Sign Verifiable Credentials 
 */

// Prerequisites: Create issuer (ticket issuer)
const ticketIssuerDid = await DidKeyMethod.create();

// Prerequisites: Create subject (alice)
const aliceDid = await DidKeyMethod.create();

// Create new credential
class TSwiftTicket {
    constructor(seat, date) {
        this.seat = seat;
        this.date = date;
    }
}
// Credential needs: type, issuer, subject, data
const vc = VerifiableCredential.create("TSwiftTicket", ticketIssuerDid.did, aliceDid.did, new TSwiftTicket("A-42", "2025-11-11"));
console.log("Unsigned VC: \n " + vc.toString() + "\n")

// Sign credential
const privateKey = (await Jose.jwkToKey({ key: ticketIssuerDid.keySet.verificationMethodKeys[0].privateKeyJwk })).keyMaterial;

const signOptions = {
  issuerDid: ticketIssuerDid.did,
  subjectDid: aliceDid.did,
  kid: `${ticketIssuerDid.did}#${ticketIssuerDid.did.split(':')[2]}`,
  signer: async (data) => await Ed25519.sign({ data, key: privateKey })
};

const signedVcJwt = await vc.sign(signOptions);
console.log("\nSigned VC: \n" + signedVcJwt + "\n")


// Verify
try {
    await VerifiableCredential.verify(signedVcJwt)
    console.log("\nVC Verification successful!\n")
} catch (err) {
    console.log("\nVC Verification failed: " + err.message + "\n")
}


// Parse
const parsedVc= VerifiableCredential.parseJwt(signedVcJwt)
console.log("\nParsed VC: \n" + parsedVc.toString() + "\n")


/** Presentation Exchange */

// Prerequisites: Create Presentation Definition
const presentationDefinition = {
    'id'                : 'presDefId123',
    'name'              : 'T Swift Ticket Presentation Definition',
    'purpose'           : 'for getting into the concert',
    'input_descriptors' : [
      {
        'id'          : 'seat',
        'purpose'     : 'where are you going to sit',
        'constraints' : {
          'fields': [
            {
              'path': [
                '$.credentialSubject.seat',
              ]
            }
          ]
        }
      }
    ]
  };

// Satisfies Presentation Definition  
try {
    PresentationExchange.validateDefinition(presentationDefinition);
    PresentationExchange.satisfiesPresentationDefinition([signedVcJwt], presentationDefinition);
    console.log("\nVC Satisfies Presentation Definition!\n")
} catch (err) {
    console.log("VC does not satisfy Presentation Definition: " + err.message)
}


// Create Presentation Result that contains a Verifiable Presentation and Presentation Submission
const presentationResult = PresentationExchange.createPresentationFromCredentials([signedVcJwt], presentationDefinition)
console.log("\nPresentation Result: " + JSON.stringify(presentationResult))


/** Storing a self signed VC in a DWN */

// Web5 Connect
const { web5, did: myDid } = await Web5.connect();

// Create VC Signer
const vcSigner = await constructVcSigner(myDid, web5);
const vcSignOptions = {
  issuerDid  : myDid,
  subjectDid : myDid,
  kid        : vcSigner.keyId,
  alg        : vcSigner.algorithm,
  signer     : vcSigner.sign
};

class DateOfBirth {
    constructor(dob) {
        this.dob = dob;
    }
}

// Create self signed VC
const dwnVc = VerifiableCredential.create("DateOfBirth", myDid, myDid, new DateOfBirth("1989-11-11"));
const signedDwnVc = await dwnVc.sign(vcSignOptions)

// Storing VC in DWN
const { record } = await web5.dwn.records.create({
    data: signedDwnVc,
    message: {
        schema: 'DateOfBirth',
        dataFormat: 'application/vc+jwt',
    },
});

console.log("\nVC Record ID: " + record.id + "\n")


// Reading VC from DWN
let { record: readRecord } = await web5.dwn.records.read({
    message: {
      filter: {
        recordId: record.id
      }
    }
});
  
const readVcJwt = await readRecord.data.text();
console.log("\nVC Record: \n" + readVcJwt + "\n")

async function constructVcSigner(author, web5Object) {
    const signingKeyId = await web5Object.agent.didManager.getDefaultSigningKey({ did: author });

    if (!signingKeyId) {
      throw new Error (`VcManager: Unable to determine signing key id for author: '${author}'`);
    }

    // DID keys stored in KeyManager use the canonicalId as an alias, so
    // normalize the signing key ID before attempting to retrieve the key.
    const parsedDid = didUtils.parseDid({ didUrl: signingKeyId });
    if (!parsedDid) {
      throw new Error(`DidIonMethod: Unable to parse DID: ${signingKeyId}`);
    }

    const normalizedDid = parsedDid.did.split(':', 3).join(':');
    const normalizedSigningKeyId = `${normalizedDid}#${parsedDid.fragment}`;
    const signingKey = await web5Object.agent.keyManager.getKey({ keyRef: normalizedSigningKeyId });

    // if (!isManagedKeyPair(signingKey)) {
    //   throw new Error(`VcManager: Signing key not found for author: '${author}'`);
    // }

    const { alg } = Jose.webCryptoToJose(signingKey.privateKey.algorithm);
    if (alg === undefined) {
      throw Error(`No algorithm provided to sign with key ID ${signingKeyId}`);
    }

    return {
      keyId     : signingKeyId,
      algorithm : alg,
      sign      : async (content) => {
        return await web5Object.agent.keyManager.sign({
          algorithm : signingKey.privateKey.algorithm,
          data      : content,
          keyRef    : normalizedSigningKeyId
        });
      }
    };
}
