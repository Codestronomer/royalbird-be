import { Response } from 'express';

/**
 *
 *
 * @export
 * @param {*} [data]
 * @param message
 * @param status
 * @param meta
 * @return {*}  {(Response | undefined)}
 */
export default function (
  this: Response,
  data?: Array<any> | Record<string, unknown> | any,
  message?: string,
  status?: string,
  meta?: Record<string, unknown>,
): Response | undefined {
  const resMessage = message || 'Request was successfully completed';
  const response: Record<string, unknown> = {
    response: {
      status: status || 'successful',
      message: resMessage,
      timestamp: new Date(),
      data,
      meta,
    },
  };

  return this.status(201).json(response.response);
}
