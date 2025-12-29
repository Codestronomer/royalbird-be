import { Response } from 'express';
import { formatResponse } from './utils';
import { ApiStatusMessages } from '../../utils';

/**
 *
 *
 * @export
 * @param {*} [data]
 * @param {*} [message]
 * @param _status
 * @return {*}  {(Response )}
 */
export default function (this: Response, data?: any, message?: string, _status?: string): Response {
  data = formatResponse(data);

  const resMessage = message || 'Resource not found';
  const response: Record<string, unknown> = {
    response: {
      status: ApiStatusMessages.failed,
      message: resMessage,
      timestamp: new Date(),
      data: data ?? null,
    },
  };

  return this.status(404).json(response.response);
}
