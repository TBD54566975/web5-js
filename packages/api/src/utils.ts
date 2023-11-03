import { Convert, universalTypeOf } from '@web5/common';

/**
 * Set/detect the media type and return the data as bytes.
 *
 * @beta
 */
export const dataToBlob = (data: any, dataFormat?: string) => {
  let dataBlob: Blob;

  // Check for Object or String, and if neither, assume bytes.
  const detectedType = universalTypeOf(data);
  if (dataFormat === 'text/plain' || detectedType === 'String') {
    dataBlob = new Blob([data], { type: 'text/plain' });
  } else if (dataFormat === 'application/json' || detectedType === 'Object') {
    const dataBytes = Convert.object(data).toUint8Array();
    dataBlob = new Blob([dataBytes], { type: 'application/json' });
  } else if (detectedType === 'Uint8Array' || detectedType === 'ArrayBuffer') {
    dataBlob = new Blob([data], { type: 'application/octet-stream' });
  } else if (detectedType === 'Blob') {
    dataBlob = data;
  } else {
    throw new Error('data type not supported.');
  }

  dataFormat = dataFormat || dataBlob.type || 'application/octet-stream';

  return { dataBlob, dataFormat };
};