import { v4 as uuid } from 'uuid';
import { Interface } from './interface.js';

export class Permissions extends Interface {
  constructor(dwn) {
    super(dwn, 'Permissions');
  }

  async request(target, request) {
    this.permissionsRequest(target, {
      ...request,
      message: {
        ...request.message,
        permissionRequestId: uuid(),
        interface: 'Permissions',
        method: 'Request',
      },
    });
  }
}
