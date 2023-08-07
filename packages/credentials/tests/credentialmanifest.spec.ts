import { expect } from 'chai';
import { Issuer, CredentialManifest, OutputDescriptor, InputDescriptor } from '../src/types.js';

describe('Credential Manifest Types', () => {
  it('creates an Output Descriptor', () => {
    const outputDescriptor: OutputDescriptor = {
      id          : 'example-id',
      schema      : 'example-schema',
      name        : 'Output Descriptor Name',
      description : 'Output Descriptor Description',
      styles      : {
        thumbnail: {
          uri : 'https://example.com/image.png',
          alt : 'image'
        },
        background: {
          color: '#ffffff'
        }
      },
      display: {
        path   : ['$.example'],
        schema : {
          type   : 'string',
          format : 'date-time'
        },
        fallback: 'N/A'
      }
    };

    expect(outputDescriptor).to.have.property('id');
    expect(outputDescriptor).to.have.property('schema');
    expect(outputDescriptor).to.have.property('name');
    expect(outputDescriptor).to.have.property('description');
    expect(outputDescriptor).to.have.property('styles');
    expect(outputDescriptor.styles).to.have.property('thumbnail');
    expect(outputDescriptor.styles).to.have.property('background');
    expect(outputDescriptor).to.have.property('display');
    expect(outputDescriptor.display).to.have.property('path');
    expect(outputDescriptor.display).to.have.property('schema');
    expect(outputDescriptor.display).to.have.property('fallback');
  });

  it('creates a credential manifest', () => {
    const issuer: Issuer = {
      id: 'did:example:123456'
    };

    const inputDescriptor: InputDescriptor = {
      id      : 'input-example',
      name    : 'Input Name',
      purpose : 'Input Purpose',
      group   : ['group1'],
    };

    const credentialManifest: CredentialManifest = {
      id                 : 'manifest-id',
      name               : 'Credential Manifest Name',
      description        : 'Credential Manifest Description',
      spec_version       : '1.0.0',
      issuer             : issuer,
      output_descriptors : [{
        id     : 'output-example',
        schema : 'schema-example'
      }],
      format                  : { key: 'value' },
      presentation_definition : {
        id                : 'pd-id',
        input_descriptors : [
          inputDescriptor
        ]
      }
    };

    expect(credentialManifest).to.have.property('id');
    expect(credentialManifest).to.have.property('name');
    expect(credentialManifest).to.have.property('description');
    expect(credentialManifest).to.have.property('spec_version');
    expect(credentialManifest).to.have.property('issuer');
    expect(credentialManifest).to.have.property('output_descriptors');
    expect(credentialManifest.output_descriptors[0]).to.have.property('id');
    expect(credentialManifest.output_descriptors[0]).to.have.property('schema');
    expect(credentialManifest).to.have.property('format');
    expect(credentialManifest.format).to.have.property('key');
    expect(credentialManifest).to.have.property('presentation_definition');
    expect(credentialManifest.presentation_definition).to.have.property('id');
    expect(credentialManifest.presentation_definition).to.have.property('input_descriptors');
    expect(credentialManifest.presentation_definition!.input_descriptors[0]).to.have.property('id');
  });

  it('creates a driver license credential manifest', () => {
    const outputDescriptor: OutputDescriptor = {
      'id'          : 'driver_license_output',
      'schema'      : 'https://schema.org/EducationalOccupationalCredential',
      'name'        : 'Washington State Driver License',
      'description' : 'License to operate a vehicle with a gross combined weight rating (GCWR) of 26,001 or more pounds, as long as the GVWR of the vehicle(s) being towed is over 10,000 pounds.',
      'styles'      : {
        'thumbnail': {
          'uri' : 'https://dol.wa.com/logo.png',
          'alt' : 'Washington State Seal'
        },
        'hero': {
          'uri' : 'https://dol.wa.com/happy-people-driving.png',
          'alt' : 'Happy people driving'
        },
        'background': {
          'color': '#ff0000'
        },
        'text': {
          'color': '#d4d400'
        }
      },
      'display': {
        'path'   : ['$.name', '$.vc.name'],
        'schema' : {
          'type': 'string'
        },
        'fallback': 'Washington State Driver License'
      }
    };

    const credentialManifest: CredentialManifest = {
      'id'           : 'WA-DL-CLASS-A',
      'spec_version' : 'https://identity.foundation/credential-manifest/spec/v1.0.0/',
      'issuer'       : {
        'id'     : 'did:example:123?linked-domains=3',
        'name'   : 'Washington State Government',
        'styles' : {
          'thumbnail': {
            'uri' : 'https://dol.wa.com/logo.png',
            'alt' : 'Washington State Seal'
          },
          'hero': {
            'uri' : 'https://dol.wa.com/people-working.png',
            'alt' : 'People working on serious things'
          },
          'background': {
            'color': '#ff0000'
          },
          'text': {
            'color': '#d4d400'
          }
        }
      },
      'output_descriptors': [
        outputDescriptor
      ]
    };

    expect(credentialManifest).to.have.property('id');
    expect(credentialManifest).to.have.property('spec_version');
    expect(credentialManifest).to.have.property('issuer');
    expect(credentialManifest).to.have.property('output_descriptors');
  });
});
