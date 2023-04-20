/**
 * NOTE: These are temporary until Web5 JS can be converted to TypeScript and import the types from dwn-sdk-js.
 */

/**
 * DWN SDK JS type definitions converted from TypeScript.
 */

/**
 * @typedef {Object} BaseMessage
 * @property {Descriptor} descriptor
 * @property {GeneralJws} authorization
 */

/**
 * @typedef {Object} Descriptor
 * @property {string} interface
 * @property {string} method
 * @property {string} [dataCid]
 * @property {number} [dataSize]
 */

/**
 * @typedef {Object} GeneralJws
 * @property {string} payload
 * @property {SignatureEntry[]} signatures
 */

/**
 * TODO: Readable isn't resolved. Expected solution is to import types from dwn-sdk-js once Web5 JS is converted to TS.
 * @typedef {Object} MessageReplyOptions
 * @property {Status} status
 * @property {QueryResultEntry[]} [entries]
 * @property {Readable} [data]
 */

/**
 * @typedef {Object} QueryResultEntry
 * @property {Descriptor} descriptor
 * @property {string} [encodedData]
 */

/**
 * @typedef {Object} SignatureEntry
 * @property {string} protected
 * @property {string} signature
 */

/**
 * @typedef {Object} Status
 * @property {number} code
 * @property {string} detail
 */

/**
 * @typedef {Object} ProtocolsConfigureDescriptor
 * @property {DwnInterfaceName.Protocols} interface
 * @property {DwnMethodName.Configure} method
 * @property {string} dateCreated
 * @property {string} protocol
 * @property {ProtocolDefinition} definition
 */

/**
 * @typedef {Object} ProtocolDefinition
 * @property {Object<string, { schema: string }>} labels
 * @property {Object<string, ProtocolRuleSet>} records
 */

/**
 * @typedef {Object} ProtocolRuleSet
 * @property {Object} [allow]
 * @property {Object} [allow.anyone]
 * @property {string[]} [allow.anyone.to]
 * @property {Object} [allow.recipient]
 * @property {string} [allow.recipient.of]
 * @property {string[]} [allow.recipient.to]
 * @property {Object<string, ProtocolRuleSet>} [records]
 */

/**
 * @typedef {BaseMessage & Object} ProtocolsConfigureMessage
 * @property {ProtocolsConfigureDescriptor} descriptor
 */

/**
 * @typedef {Object} ProtocolsQueryDescriptor
 * @property {DwnInterfaceName.Protocols} interface
 * @property {DwnMethodName.Query} method
 * @property {string} dateCreated
 * @property {Object} [filter]
 * @property {string} [filter.protocol]
 */

/**
 * @typedef {BaseMessage & Object} ProtocolsQueryMessage
 * @property {ProtocolsQueryDescriptor} descriptor
 */

/**
 * @typedef {Object} RecordsWriteDescriptor
 * @property {DwnInterfaceName.Records} interface
 * @property {DwnMethodName.Write} method
 * @property {string} [protocol]
 * @property {string} recipient
 * @property {string} [schema]
 * @property {string} [parentId]
 * @property {string} dataCid
 * @property {number} dataSize
 * @property {string} dateCreated
 * @property {string} dateModified
 * @property {boolean} [published]
 * @property {string} [datePublished]
 * @property {string} dataFormat
 */

/**
 * @typedef {BaseMessage & Object} RecordsWriteMessage
 * @property {string} recordId
 * @property {string} [contextId]
 * @property {RecordsWriteDescriptor} descriptor
 * @property {GeneralJws} [attestation]
 */

/**
 * @typedef {Object} RecordsQueryDescriptor
 * @property {DwnInterfaceName.Records} interface
 * @property {DwnMethodName.Query} method
 * @property {string} dateCreated
 * @property {RecordsQueryFilter} filter
 * @property {DateSort} [dateSort]
 */

/**
 * @typedef {'Records'} DwnInterfaceName.Records
 */
/**
 * @typedef {'Hooks'} DwnInterfaceName.Hooks
 */
/**
 * @typedef {'Protocols'} DwnInterfaceName.Protocols
 */
/**
 * @typedef {'Permissions'} DwnInterfaceName.Permissions
 */
/**
 * @typedef {'Configure'} DwnMethodName.Configure
 */
/**
 * @typedef {'Grant'} DwnMethodName.Grant
 */
/**
 * @typedef {'Query'} DwnMethodName.Query
 */
/**
 * @typedef {'Read'} DwnMethodName.Read
 */
/**
 * @typedef {'Request'} DwnMethodName.Request
 */
/**
 * @typedef {'Write'} DwnMethodName.Write
 */
/**
 * @typedef {'Delete'} DwnMethodName.Delete
 */

/**
 * @typedef {Object} RecordsQueryFilter
 * @property {string} [attester]
 * @property {string} [recipient]
 * @property {string} [protocol]
 * @property {string} [contextId]
 * @property {string} [schema]
 * @property {string} [recordId]
 * @property {string} [parentId]
 * @property {string} [dataFormat]
 * @property {RangeCriterion} [dateCreated]
 */

/**
 * @typedef {Object} RangeCriterion
 * @property {string} [from]
 * @property {string} [to]
 */

/**
 * @typedef {BaseMessage & Object} RecordsQueryMessage
 * @property {RecordsQueryDescriptor} descriptor
 */

/**
 * @typedef {Object} RecordsReadMessage
 * @property {GeneralJws} [authorization]
 * @property {RecordsReadDescriptor} descriptor
 */

/**
 * @typedef {Object} RecordsReadDescriptor
 * @property {DwnInterfaceName.Records} interface
 * @property {DwnMethodName.Read} method
 * @property {string} recordId
 * @property {string} date
 */

/**
 * @typedef {BaseMessage & Object} RecordsDeleteMessage
 * @property {RecordsDeleteDescriptor} descriptor
 */

/**
 * @typedef {Object} RecordsDeleteDescriptor
 * @property {DwnInterfaceName.Records} interface
 * @property {DwnMethodName.Delete} method
 * @property {string} recordId
 * @property {string} dateModified
 */
