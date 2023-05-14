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

/**
 * An enumeration.
 * @export
 * @enum {string}
 */

export const ProgrammingLanguage = {
  Javascript: 'javascript',
  Python: 'python',
  Dotnet: 'dotnet',
  Golang: 'golang',
  Ruby: 'ruby',
  Java: 'java',
  KongGateway: 'kong_gateway',
} as const;

export type ProgrammingLanguage = typeof ProgrammingLanguage[keyof typeof ProgrammingLanguage];
