/* tslint:disable */
/* eslint-disable */
/**
 * Permit.io API
 *  Authorization as a service
 *
 * The version of the OpenAPI document: 2.0.0
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

// May contain unused imports in some cases
// @ts-ignore
import { ElementsConfigRead } from './elements-config-read';

/**
 *
 * @export
 * @interface PaginatedResultElementsConfigRead
 */
export interface PaginatedResultElementsConfigRead {
  /**
   * List of Elements Configs
   * @type {Array<ElementsConfigRead>}
   * @memberof PaginatedResultElementsConfigRead
   */
  data: Array<ElementsConfigRead>;
  /**
   *
   * @type {number}
   * @memberof PaginatedResultElementsConfigRead
   */
  total_count: number;
  /**
   *
   * @type {number}
   * @memberof PaginatedResultElementsConfigRead
   */
  page_count?: number;
}
