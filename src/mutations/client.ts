import axios, { AxiosInstance } from 'axios';
import { Logger } from 'winston';

import { IPermitConfig } from '../config';
import { IUser } from '../enforcement/interfaces';
import { Dict } from '../utils/dict';

export interface ITenant {
  key: string;
  name: string;
  description?: string;
}

/**
 * This interface contains *read actions* that goes outside
 * of your local network and queries permit.io cloud api.
 * You should be aware that these actions incur some cross-cloud latency.
 */
export interface IPermitCloudReads {
  getUser(userKey: string): Promise<Dict>;
  getRole(roleKey: string): Promise<Dict>;
  getTenant(tenantKey: string): Promise<Dict>;
  getAssignedRoles(userKey: string, tenantKey?: string): Promise<Dict>; // either in one tenant or in all tenants
}

/**
 * This interface contains *write actions* (or mutations) that manipulate remote
 * state by calling the permit.io api. These api calls goes *outside* your local network.
 * You should be aware that these actions incur some cross-cloud latency.
 */
export interface IPermitCloudMutations {
  // user mutations
  syncUser(user: IUser): Promise<Dict>; // create or update
  deleteUser(userKey: string): Promise<number>;

  // tenant mutations
  createTenant(tenant: ITenant): Promise<Dict>;
  updateTenant(tenant: ITenant): Promise<Dict>;
  deleteTenant(tenantKey: string): Promise<number>;

  // role mutations
  assignRole(userKey: string, roleKey: string, tenantKey: string): Promise<Dict>;
  unassignRole(userKey: string, roleKey: string, tenantKey: string): Promise<Dict>;
}

export interface CloudReadCallback<T = void> {
  (api: IPermitCloudReads): Promise<T>;
}

export interface CloudWriteCallback<T = void> {
  (api: IPermitCloudMutations): Promise<T>;
}

export interface IMutationsClient {
  read<T = void>(callback: CloudReadCallback<T>): Promise<T>;
  save<T = void>(callback: CloudWriteCallback<T>): Promise<T>;
}

export class MutationsClient implements IPermitCloudReads, IPermitCloudMutations, IMutationsClient {
  private client: AxiosInstance = axios.create();

  constructor(private config: IPermitConfig, private logger: Logger) {
    this.client = axios.create({
      baseURL: `${this.config.pdp}/`,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // read api -----------------------------------------------------------------
  public async getUser(userKey: string): Promise<Dict> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.getUser(${userKey})`);
    }
    return this.client
      .get(`cloud/users/${userKey}`)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(`tried to get user with key: ${userKey}, got error: ${error}`);
        throw error;
      });
  }

  public async getRole(roleKey: string): Promise<Dict> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.getRole(${roleKey})`);
    }
    return this.client
      .get(`cloud/roles/${roleKey}`)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(`tried to get role with id: ${roleKey}, got error: ${error}`);
        throw error;
      });
  }

  public async getTenant(tenantKey: string): Promise<Dict> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.getTenant(${tenantKey})`);
    }
    return this.client
      .get(`cloud/tenants/${tenantKey}`)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(`tried to get tenant with id: ${tenantKey}, got error: ${error}`);
        throw error;
      });
  }

  // either in one tenant or in all tenants
  // TODO: fix schema
  public async getAssignedRoles(userKey: string, tenantKey?: string): Promise<Dict> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.getAssignedRoles(user=${userKey}, tenant=${tenantKey})`);
    }
    let url = `cloud/role_assignments?user=${userKey}`;
    if (tenantKey !== undefined) {
      url += `&tenant=${tenantKey}`;
    }
    return await this.client
      .get<Dict>(url)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(`could not get user roles for user ${userKey}, got error: ${error}`);
        throw error;
      });
  }

  // write api ----------------------------------------------------------------
  // user mutations
  public async syncUser(user: IUser): Promise<Dict> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.syncUser(${JSON.stringify(user)})`);
    }
    return await this.client
      .put<Dict>('cloud/users', user)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(`tried to sync user with key: ${user.key}, got error: ${error}`);
        throw error;
      });
  }

  public async deleteUser(userKey: string): Promise<number> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.deleteUser(${userKey})`);
    }
    return await this.client
      .delete(`cloud/users/${userKey}`)
      .then((response) => {
        return response.status;
      })
      .catch((error: Error) => {
        this.logger.error(`tried to delete user with key: ${userKey}, got error: ${error}`);
        throw error;
      });
  }

  // tenant mutations
  public async createTenant(tenant: ITenant): Promise<Dict> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.createTenant(${JSON.stringify(tenant)})`);
    }
    const data: Dict = {};
    data.externalId = tenant.key;
    data.name = tenant.name;
    if (tenant.description) {
      data.description = tenant.description;
    }

    return await this.client
      .put<Dict>('cloud/tenants', data)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(`tried to create tenant with key: ${tenant.key}, got error: ${error}`);
        throw error;
      });
  }

  public async updateTenant(tenant: ITenant): Promise<Dict> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.updateTenant(${JSON.stringify(tenant)})`);
    }
    const data: Dict = {};
    data.name = tenant.name;

    if (tenant.description) {
      data.description = tenant.description;
    }

    return await this.client
      .patch<Dict>(`cloud/tenants/${tenant.key}`, data)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(`tried to update tenant with key: ${tenant.key}, got error: ${error}`);
        throw error;
      });
  }

  public async deleteTenant(tenantKey: string): Promise<number> {
    if (this.config.debugMode) {
      this.logger.info(`permit.api.deleteTenant(${tenantKey})`);
    }
    return await this.client
      .delete(`cloud/tenants/${tenantKey}`)
      .then((response) => {
        return response.status;
      })
      .catch((error: Error) => {
        this.logger.error(`tried to delete tenant with key: ${tenantKey}, got error: ${error}`);
        throw error;
      });
  }

  // role mutations
  public async assignRole(userKey: string, roleKey: string, tenantKey: string): Promise<Dict> {
    const data = {
      role: roleKey,
      user: userKey,
      scope: tenantKey,
    };

    if (this.config.debugMode) {
      this.logger.info(`permit.api.assignRole(${JSON.stringify(data)})`);
    }

    return await this.client
      .post<Dict>('cloud/role_assignments', data)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(
          `could not assign role ${roleKey} to ${userKey} in tenant ${tenantKey}, got error: ${error}`,
        );
        throw error;
      });
  }

  public async unassignRole(userKey: string, roleKey: string, tenantKey: string): Promise<Dict> {
    if (this.config.debugMode) {
      const data = {
        role: roleKey,
        user: userKey,
        scope: tenantKey,
      };
      this.logger.info(`permit.api.assignRole(${JSON.stringify(data)})`);
    }

    return await this.client
      .delete<Dict>(`cloud/role_assignments?role=${roleKey}&user=${userKey}&scope=${tenantKey}`)
      .then((response) => {
        return response.data;
      })
      .catch((error: Error) => {
        this.logger.error(
          `could not unassign role ${roleKey} of ${userKey} in tenant ${tenantKey}, got error: ${error}`,
        );
        throw error;
      });
  }

  // cloud api proxy ----------------------------------------------------------
  public async read<T = void>(callback: CloudReadCallback<T>): Promise<T> {
    const readProxy: IPermitCloudReads = {
      getUser: this.getUser.bind(this),
      getRole: this.getRole.bind(this),
      getTenant: this.getTenant.bind(this),
      getAssignedRoles: this.getAssignedRoles.bind(this),
    };
    return await callback(readProxy);
  }

  public async save<T = void>(callback: CloudWriteCallback<T>): Promise<T> {
    const writeProxy: IPermitCloudMutations = {
      syncUser: this.syncUser.bind(this),
      deleteUser: this.deleteUser.bind(this),
      createTenant: this.createTenant.bind(this),
      updateTenant: this.updateTenant.bind(this),
      deleteTenant: this.deleteTenant.bind(this),
      assignRole: this.assignRole.bind(this),
      unassignRole: this.unassignRole.bind(this),
    };
    return await callback(writeProxy);
  }

  public getMethods(): IMutationsClient {
    return {
      read: this.read.bind(this),
      save: this.save.bind(this),
    };
  }
}
