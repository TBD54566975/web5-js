
/**
 * @see {@link https://www.w3.org/TR/vc-data-model/#credentials | VC data model}
 */
export type VerifiableCredential = {
  /** see {@link https://www.w3.org/TR/vc-data-model/#contexts | Contexts} */
  '@context': ['https://www.w3.org/2018/credentials/v1', ...string[]];
  credentialSubject: CredentialSubject | CredentialSubject[];
  /** @see {@link https://www.w3.org/TR/vc-data-model/#identifiers | Identifiers} */
  id?: string;
  /** @see {@link IssuerType} */
  issuer: Issuer;
  /** @see {@link https://www.w3.org/TR/vc-data-model/#types | Types} */
  type?: string[] | string;
  /** @see {@link https://www.w3.org/TR/vc-data-model/#issuance-date | Issuance Date} */
  issuanceDate: string;
  /** @see {@link https://www.w3.org/TR/vc-data-model/#expiration | Expiration} */
  expirationDate?: string;
  /** @see {@link CredentialStatusReference} */
  credentialStatus?: CredentialStatusReference;
  [key: string]: any;
}

/**
 * The issuer of a {@link VerifiableCredential}.
 * The value of the issuer property must be either a URI or an object containing an `id` property.
 * It is _recommended_ that the URI in the issuer or its id be one which, if de-referenced, results in a document
 * containing machine-readable information about the issuer that can be used to verify the information expressed in the
 * credential.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#issuer | Issuer data model}
 */
export type Issuer = {
  /** @see {@link https://www.w3.org/TR/vc-data-model/#identifiers | Identifiers} */
  id: string;
  [key: string]: any;
} | string

/**
 * The value of the `credentialSubject` property is defined as a set of objects that contain one or more properties that
 * are each related to a subject of the verifiable credential. Each object MAY contain an id.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#credential-subject | Credential Subject}
 */
export type CredentialSubject = {
  /** @see {@link https://www.w3.org/TR/vc-data-model/#identifiers | Identifiers} */
  id?: string;
  [key: string]: any;
}

/**
 * Used for the discovery of information about the current status of a verifiable credential, such as whether it is
 * suspended or revoked.
 * The precise contents of the credential status information is determined by the specific `credentialStatus` type
 * definition, and varies depending on factors such as whether it is simple to implement or if it is privacy-enhancing.
 *
 * See {@link https://www.w3.org/TR/vc-data-model/#status | Credential Status}
 */
export type CredentialStatusReference = {
  /** @see {@link https://www.w3.org/TR/vc-data-model/#identifiers | Identifiers} */
  id: string;
  /** expresses the credential status type (also referred to as the credential status method).
   * It is expected that the value will provide enough information to determine the current status
   * of the credential and that machine readable information needs to be retrievable from the URI.
   * For example, the object could contain a link to an external document noting whether or not the credential
   * is suspended or revoked.
   */
  type: string;
  [key: string]: any;
}

/**
 * proof property of a {@link VerifiableCredential}
 */
export type ProofType = {
  /** @see {@link https://www.w3.org/TR/vc-data-model/#types | Types} */
  type?: string;
  [key: string]: any;
}

/**
 * See {@link https://identity.foundation/credential-manifest/#credential-manifest | Credential Manifest}
 */
export type CredentialManifest = {
  /** String providing a unique identifier for the desired context */
  id: string;
  /** String that acts as a summarizing title for the CredentialManifest */
  name?: string;
  /**
   * String explaining what the CredentialManifest is generally offering for meeting
   * its requirements
  */
  description?: string;
  /**
   * URI string to a
   * {@link https://identity.foundation/credential-manifest/#versioning | versioning spec}
  */
  spec_version?: string;
  issuer: {
    /** URI string that identifies who the issuer of the credential(s) will be */
    id: string;
    /** Human-readable name the issuer wishes to be recognized by */
    name?: string;
    /** Object or URI of the EntityStyle to style information about the issuer with */
    styles: EntityStyle | string;
  }
  /** @see {@link https://identity.foundation/credential-manifest/#output-descriptor | Output Descriptor} */
  output_descriptors: OutputDescriptor[];
  /** @see {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definiton}'s `format` property */
  format?: Format
  /** @see {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definition} */
  presentation_definition?: PresentationDefinition;
}

/**
 * See {@link https://identity.foundation/wallet-rendering/v0.0.1/#entity-styles | Entity Styles}
 */
export type EntityStyle = {
  thumbnail?: Image
  hero?: Image
  background?: Colorable
  text?: Colorable
}

export type Image = {
  /** Valid URI string to an image resource */
  uri: string;
  /** String that describes the alternate text for the image */
  alt?: string;
}

export type Colorable = {
  /** HEX string color value */
  color?: string
}

/** See {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definition} */
export type PresentationDefinition = {
  /** String providing a unique identifier for the desired context */
  id: string;
  /** @see {@link https://identity.foundation/presentation-exchange/#input-descriptor-object | Input Descriptor} */
  input_descriptors: InputDescriptor[];
  /** Human-readable string intended to constitute a distinctive designation of the PresentationDefinition */
  name?: string;
  /** String that describes the purpose for which the PresentationDefinition's inputs are being used for */
  purpose?: string;
  /** @see {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definiton}'s `format` property */
  format?: Format;
}

/**
 * See {@link https://identity.foundation/presentation-exchange/#input-descriptor-object | Input Descriptor}
 */
export type InputDescriptor = {
  /**
   * Unique string that does not conflict with the `id` of another `InputDescriptor`
   * in the same `PresentationDefinition`
  */
  id: string;
  /** Human-readable string that describes wha thte target schema represents */
  name?: string;
  /** Human-readable string that describes the purpose for which the Claim's data is being requested */
  purpose?: string;
  /**
   * See {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definiton}'s
   * `format` property
   */
  format?: Format;
  constraints: {
    fields?: {
      /**
       * Array of one ore more JSONPath string expressions that select a target
       * value from the input
      */
      path: string[];
      /**
       * Unique string from every other field object's `id` property, including those
       * contained in other `InputDescriptor` objects
      */
      id?: string;
      /** String describing the purpose for which the field is being requested */
      purpose?: string;
      /** Human-readable string that describes what the target field represents */
      name?: string;
      /**
       * JSON Schema descriptor used to filter against the values returned from
       * evaluation of the JSONPath string expressions in the `path` array.
       */
      filter?: Filter;
      /** Boolean representing if the requested field is optional */
      optional?: boolean;
    }[]
    limit_disclosure?: 'required' | 'preferred';
  }
}

/**
 * See {@link https://identity.foundation/credential-manifest/#output-descriptor | Output Descriptor}
 */
export type OutputDescriptor = {
  /** String that does not conflict with the `id` of another OutputDescriptor in the same CredentialManifest */
  id: string;
  /** String specifying the schema of the credential to be issued */
  schema: string;
  /** Human-readable string that describes what the credential represents */
  name?: string;
  /** Human-readable string that descripbes what the credential is in greater detail */
  description?: string;
  /** Object or URI of the {@link https://identity.foundation/wallet-rendering/v0.0.1/#entity-styles | Entity Style} to render the OutputDescriptor */
  styles?: EntityStyle | string;
  /** Object or URI of the {@link https://identity.foundation/wallet-rendering/v0.0.1/#display-mapping-object | Display Mapping} used to pull data from the target Claim */
  display?: DisplayMapping | string;
}

/** See {@link https://identity.foundation/wallet-rendering/v0.0.1/#display-mapping-object | Display Mapping Object} */
export type DisplayMapping = {
  /** Array of JSONPath string expressions */
  path: string[];
  schema: {
    /** Represents the type of data found with the `path` property */
    type: 'string' | 'boolean' | 'number' | 'integer';
    /** If the `type` property is "string", this property is used to format the string in any rendered UI */
    format?: 'date-time' | 'time' | 'date' | 'email' | 'idn-email' | 'hostname' | 'idn-hostname' |
     'ipv4' | 'ipv6' | 'uri' | 'uri-reference' | 'iri' | 'iri-reference';
  }
  /**
   * String to be rendered into the UI if all the `path` property's item's value is
   * undefined OR incorrectly processed
  */
  fallback?: string;
}

/** See {@link https://identity.foundation/presentation-exchange/#presentation-definition | Presentation Definiton}'s `format` property */
export type Format = {
  [key: string]: any;
}

/** See {@link https://identity.foundation/presentation-exchange/#input-descriptor-object | Input Descriptor}'s `constraints.fields.filter` property */
export type Filter = {
  [key: string]: any;
}