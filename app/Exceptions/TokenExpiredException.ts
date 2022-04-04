import { Exception } from '@adonisjs/core/build/standalone';
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

/*
|--------------------------------------------------------------------------
| Exception
|--------------------------------------------------------------------------
|
| The Exception class imported from `@adonisjs/core` allows defining
| a status code and error code for every exception.
|
| @example
| new TokenExpiredException('message', 500, 'E_RUNTIME_EXCEPTION')
|
*/
export default class TokenExpiredException extends Exception {
    public message = 'token has expired';
    public status = 410;
    public code = 'TOKEN_EXPIRED';

    constructor() {
        super('token has expired', 410, 'TOKEN_EXPIRED');
    }

    public async handle(error: this, context: HttpContextContract) {
        return context.response
            .status(error.status)
            .send({
                message: error.message,
                status: error.status,
                code: error.code,
            });
    }
}
