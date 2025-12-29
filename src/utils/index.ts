export { generateRandomString } from './string';

export const isObject = (variable) => {
  if (!variable) return false;

  return Object.prototype.toString.call(variable) === '[object Object]';
};

export enum ApiStatusMessages {
  inputValidationError = 'input_validation_error',
  resourceNotFound = 'resource_not_found',
  unauthorizedRequest = 'unauthorized_request',
  internalServerError = 'internal_server_error',
  duplicateResourceError = 'duplicate_resource_error',
  badRequest = 'bad_request',
  failed = 'failed',
  successful = 'successful',
}
