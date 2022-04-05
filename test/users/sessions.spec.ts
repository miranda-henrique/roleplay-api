import Database from '@ioc:Adonis/Lucid/Database';
import { UserFactory } from 'Database/factories';
import test from 'japa';
import supertest from 'supertest';

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`;

test.group('Session', (group) => {
    test('it should authenticate an user', async (assert) => {
        const plainTextPassword = 'testPassword';
        const user = await UserFactory.merge({ password: plainTextPassword }).create();
        const { id, email } = user;

        const { body } = await supertest(BASE_URL)
            .post('/sessions')
            .send({
                email: email,
                password: plainTextPassword,
            })
            .expect(201);

        assert.isDefined(body.user, 'User undefined');
        assert.equal(body.user.id, id);
    });

    test('it should return an api token when session is created', async (assert) => {
        const plainTextPassword = 'test';
        const user = await UserFactory.merge({ password: plainTextPassword }).create();
        const { id, email } = user;

        const { body } = await supertest(BASE_URL)
            .post('/sessions')
            .send({
                email: email,
                password: plainTextPassword,
            })
            .expect(201);

        assert.isDefined(body.token, 'Token undefined');
        assert.equal(body.user.id, id);
    });

    test('it should return 400 when credentials are not provided', async (assert) => {
        const { body } = await supertest(BASE_URL)
            .post('/sessions')
            .send({})
            .expect(400);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 400);
    });

    test('it should return 400 when credentials are invalid', async (assert) => {
        const user = await UserFactory.create();
        const { email } = user;

        const { body } = await supertest(BASE_URL)
            .post('/sessions')
            .send({
                email: email,
                password: 'testPassword',
            })
            .expect(400);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 400);
    });

    test('it should return 200 when user signs out', async () => {
        const plainTextPassword = 'testPassword';
        const user = await UserFactory.merge({ password: plainTextPassword }).create();
        const { id, email } = user;

        const { body } = await supertest(BASE_URL)
            .post('/sessions')
            .send({
                email: email,
                password: plainTextPassword,
            })
            .expect(201);

        const apiToken = body.token;

        await supertest(BASE_URL)
            .delete('/sessions')
            .set('Authorization', `Bearer ${apiToken.token}`)
            .expect(200);
    });

    test.only('it should revoke token when users signs out', async (assert) => {
        const plainTextPassword = 'testPassword';
        const user = await UserFactory.merge({ password: plainTextPassword }).create();
        const { email } = user;

        const { body } = await supertest(BASE_URL)
            .post('/sessions')
            .send({
                email: email,
                password: plainTextPassword,
            })
            .expect(201);

        const apiToken = body.token;

        const tokenBeforeSignOut = await Database.query()
            .select('*')
            .from('api_tokens');
        console.log({ tokenBeforeSignOut });


        await supertest(BASE_URL)
            .delete('/sessions')
            .set('Authorization', `Bearer ${apiToken.token}`)
            .expect(200);

        const tokenAfterSignOut = await Database.query()
            .select('*')
            .from('api_tokens');

        console.log({ tokenAfterSignOut });
        assert.isEmpty(tokenAfterSignOut);
    });

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });
});