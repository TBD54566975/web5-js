import { v4 as uuid } from 'uuid';

import { Interface } from './Interface.js';

class Permissions extends Interface {
  constructor(dwn) {
    super(dwn, dwn.SDK.DwnInterfaceName.Permissions);
  }

  async request(target, request) {
    // TODO: Remove this once Permissions implemented in dwn-sdk-js
    return this.dwn.web5.did.permissionsRequest(target, {
      ...request,
      message: {
        ...request.message,
        permissionRequestId: uuid(),
        interface: this.dwn.SDK.DwnInterfaceName.Permissions,
        method: this.dwn.SDK.DwnMethodName.Request,
      },
    });
  }
}

export {
  Permissions,
};
