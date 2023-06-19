import axios, { AxiosError, AxiosResponse } from 'axios';
import { Logger } from 'winston';

import { IPermitConfig } from '../config';
import { APIKeysApi, Configuration } from '../openapi';
import { BASE_PATH } from '../openapi/base';

import { API_ACCESS_LEVELS, ApiContextLevel, ApiKeyLevel, PermitContextError } from './context';

export class PermitApiError<T> extends Error {
  constructor(message: string, public originalError: AxiosError<T>) {
    super(message);
  }

  public get request(): any {
    return this.originalError.request;
  }

  public get response(): AxiosResponse<T> | undefined {
    return this.originalError.response;
  }
}

export interface IPagination {
  /**
   * the page number to fetch (default: 1)
   */
  page?: number;
  /**
   * how many items to fetch per page (default: 100)
   */
  perPage?: number;
}

export abstract class BasePermitApi {
  protected openapiClientConfig: Configuration;
  private scopeApi: APIKeysApi;

  constructor(protected config: IPermitConfig, protected logger: Logger) {
    this.openapiClientConfig = new Configuration({
      basePath: `${this.config.apiUrl}`,
      accessToken: this.config.token,
    });
    this.scopeApi = new APIKeysApi(this.openapiClientConfig, BASE_PATH, this.config.axiosInstance);
  }

  /**
   * Sets the API context and permitted access level based on the API key scope.
   */
  private async setContextFromApiKey(): Promise<void> {
    try {
      this.logger.debug('Fetching api key scope');
      const response = await this.scopeApi.getApiKeyScope();

      if (response.data.organization_id !== undefined && response.data.organization_id !== null) {
        this.config.apiContext._saveApiKeyAccessibleScope(
          response.data.organization_id,
          response.data.project_id,
          response.data.environment_id,
        );

        if (response.data.project_id !== undefined && response.data.project_id !== null) {
          if (response.data.environment_id !== undefined && response.data.environment_id !== null) {
            // set environment level context
            this.logger.debug(`setting: environment-level api context`);
            this.config.apiContext.setEnvironmentLevelContext(
              response.data.organization_id,
              response.data.project_id,
              response.data.environment_id,
            );
            return;
          }

          // set project level context
          this.logger.debug(`setting: project-level api context`);
          this.config.apiContext.setProjectLevelContext(
            response.data.organization_id,
            response.data.project_id,
          );
          return;
        }

        // set org level context
        this.logger.debug(`setting: organization-level api context`);
        this.config.apiContext.setOrganizationLevelContext(response.data.organization_id);
        return;
      }

      throw new PermitContextError('could not set api context level');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        this.logger.error(
          `[${err?.response?.status}] permit.api.getApiKeyScope(), err: ${JSON.stringify(
            err?.response?.data,
          )}`,
        );
      }
      throw new PermitContextError(
        'could not fetch the api key scope in order to set the api context level',
      );
    }
  }

  /**
   * Ensure that the API Key has the necessary permissions to successfully call the API endpoint.
   * Note that this check is not foolproof, and the API may still throw 401.
   * @param requiredAccessLevel The required API Key Access level for the endpoint.
   * @throws PermitContextError If the currently set API key access level does not match the required access level.
   */
  public async ensureAccessLevel(requiredAccessLevel: ApiKeyLevel): Promise<void> {
    // should only happen once in the lifetime of the SDK
    if (
      this.config.apiContext.contextLevel === ApiContextLevel.WAIT_FOR_INIT ||
      this.config.apiContext.permittedAccessLevel === ApiKeyLevel.WAIT_FOR_INIT
    ) {
      await this.setContextFromApiKey();
    }

    if (requiredAccessLevel !== this.config.apiContext.permittedAccessLevel) {
      if (
        API_ACCESS_LEVELS.indexOf(requiredAccessLevel) <
        API_ACCESS_LEVELS.indexOf(this.config.apiContext.permittedAccessLevel)
      ) {
        throw new PermitContextError(
          `You're trying to use an SDK method that requires an API Key with access level: ${requiredAccessLevel}, ` +
            `however the SDK is running with an API key with level ${this.config.apiContext.permittedAccessLevel}.`,
        );
      }
    }
  }

  /**
   * Ensure that the API context matches the required endpoint context.
   * @param requiredContext The required API context level for the endpoint.
   * @throws PermitContextError If the currently set API context level does not match the required context level.
   */
  public async ensureContext(requiredContext: ApiContextLevel): Promise<void> {
    // should only happen once in the lifetime of the SDK
    if (
      this.config.apiContext.contextLevel === ApiContextLevel.WAIT_FOR_INIT ||
      this.config.apiContext.permittedAccessLevel === ApiKeyLevel.WAIT_FOR_INIT
    ) {
      await this.setContextFromApiKey();
    }

    if (
      this.config.apiContext.contextLevel < requiredContext ||
      this.config.apiContext.contextLevel === ApiContextLevel.WAIT_FOR_INIT
    ) {
      throw new PermitContextError(
        `You're trying to use an SDK method that requires an API context of ${ApiContextLevel[requiredContext]}, ` +
          `however the SDK is running in a less specific context level: ${
            ApiContextLevel[this.config.apiContext.contextLevel]
          }.`,
      );
    }
  }

  protected handleApiError(err: unknown): never {
    if (axios.isAxiosError(err)) {
      // this is an http response with an error status code
      const message = `Got error status code: ${err.response?.status}`;
      // log this to the SDK logger
      this.logger.error(`${message}, err: ${JSON.stringify(err?.response?.data)}`);
      // and throw a permit error exception
      throw new PermitApiError(message, err);
    } else {
      // unexpected error, just throw
      throw err;
    }
  }
}
