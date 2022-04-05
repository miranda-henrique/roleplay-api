/*
|--------------------------------------------------------------------------
| Http Exception Handler
|--------------------------------------------------------------------------
|
| AdonisJs will forward all exceptions occurred during an HTTP request to
| the following class. You can learn more about exception handling by
| reading docs.
|
| The exception handler extends a base `HttpExceptionHandler` which is not
| mandatory, however it can do lot of heavy lifting to handle the errors
| properly.
|
*/

import Logger from '@ioc:Adonis/Core/Logger';
import HttpExceptionHandler from '@ioc:Adonis/Core/HttpExceptionHandler';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import { Exception } from '@adonisjs/core/build/standalone';

export default class ExceptionHandler extends HttpExceptionHandler {
  constructor() {
    super(Logger);
  }

  public async handle(error: Exception, context: HttpContextContract) {
    console.log(error);
    if (error.status === 422) {
      return context.response.status(error.status).send({
        code: 'BAD_REQUEST',
        message: error.message,
        status: error.status,
        errors: error['messages']?.errors ? error['messages'].errors : '',
      });
    } else if (error.code === 'E_ROW_NOT_FOUND') {
      return context.response.status(error.status).send({
        code: 'BAD_REQUEST',
        message: 'resource not found',
        status: 404,
        errors: error['messages']?.errors ? error['messages'].errors : '',
      });
    } else if (error.code === 'E_INVALID_AUTH_UID') {
      return context.response.status(error.status).send({
        code: 'BAD_REQUEST',
        message: 'invalid credentials',
        status: 400,
        errors: error['messages']?.errors ? error['messages'].errors : '',
      });
    } else if (error.code === 'E_INVALID_AUTH_PASSWORD') {
      return context.response.status(error.status).send({
        code: 'BAD_REQUEST',
        message: 'invalid password',
        status: 400,
        errors: error['messages']?.errors ? error['messages'].errors : '',
      });
    }

    return super.handle(error, context);
  }
}
