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
import { AuditLog } from './audit-log';

/**
 *
 * @export
 * @interface PaginatedResultAuditLog
 */
export interface PaginatedResultAuditLog {
  /**
   * List of Audit Logs
   * @type {Array<AuditLog>}
   * @memberof PaginatedResultAuditLog
   */
  data: Array<AuditLog>;
  /**
   *
   * @type {number}
   * @memberof PaginatedResultAuditLog
   */
  total_count: number;
  /**
   *
   * @type {number}
   * @memberof PaginatedResultAuditLog
   */
  page_count?: number;
}
