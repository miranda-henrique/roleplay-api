import Database from '@ioc:Adonis/Lucid/Database';
import { UserFactory } from 'Database/factories';
import test from 'japa';
import supertest from 'supertest';
import Hash from '@ioc:Adonis/Core/Hash';

const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`;
let token = '';

// User object:

// {
//     "users": {
//         "id": number,
//         "email": string,
//         "username": string,
//         "password": string,
//         "avatar": string,
//     }
// }

test.group('User', (group) => {
    test('it should create an user', async (assert) => {
        const userPayload = {
            email: 'test@test.com',
            username: 'test',
            password: 'test',
            avatar: 'https://fakeimageurljustfortesting.com/image1',
        };

        const { body } = await supertest(BASE_URL)
            .post('/users')
            .send(userPayload)
            .expect(201);


        assert.exists(body.user, 'User undefined');
        assert.exists(body.user.id, 'Id undefined');
        assert.equal(body.user.email, userPayload.email);
        assert.equal(body.user.username, userPayload.username);
        assert.notExists(body.user.password, 'Password defined');
    });

    test('it should return 409 when email is already in use', async (assert) => {
        const { email } = await UserFactory.create();

        const { body } = await supertest(BASE_URL)
            .post('/users')
            .send({
                email,
                username: 'test',
                password: 'test',
            })
            .expect(409);

        assert.exists(body.message);
        assert.exists(body.code);
        assert.exists(body.status);
        assert.include(body.message, 'email');
        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 409);
    });

    test('it should return 409 when username is already in use', async (assert) => {
        const { username } = await UserFactory.create();
        const { body } = await supertest(BASE_URL)
            .post('/users')
            .send({
                email: 'test@test.com',
                username: username,
                password: 'test',
            })
            .expect(409);

        assert.exists(body.message);
        assert.exists(body.code);
        assert.exists(body.status);
        assert.include(body.message, 'username');
        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 409);
    });

    //422
    test('it should return 422 when required data is not provided', async (assert) => {
        const { body } = await supertest(BASE_URL)
            .post('/users')
            .send({})
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when invalid username is provided', async (assert) => {
        const { body } = await supertest(BASE_URL)
            .post('/users')
            .send({
                username: 123,
                password: 'test',
                email: 'test@test.com',
            })
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when provided password is not a string', async (assert) => {
        const { body } = await supertest(BASE_URL)
            .post('/users')
            .send({
                password: 123,
                username: 'test',
                email: 'test@test.com',
            });

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when provided password has less than four characters', async (assert) => {
        const { body } = await supertest(BASE_URL)
            .post('/users')
            .send({
                password: 'tes',
                username: 'test',
                email: 'test@test.com',
            });

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when invalid email is provided', async (assert) => {
        const { body } = await supertest(BASE_URL)
            .post('/users')
            .send({
                email: 'test@',
                username: 'test',
                password: 'test',
            });

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should update a user', async (assert) => {
        const { id, password } = await UserFactory.create();
        const email = 'test@test.com';
        const avatar = 'https://github.com/miranda-henrique.png';

        const { body } = await supertest(BASE_URL)
            .put(`/users/${id}`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({
                email,
                avatar,
                password,
            })
            .expect(200);

        assert.exists(body.user, 'User undefined');
        assert.equal(body.user.email, email);
        assert.equal(body.user.avatar, avatar);
        assert.equal(body.user.id, id);
    });

    test("it should update user's password", async (assert) => {
        const user = await UserFactory.create();
        const password = 'test';

        const { body } = await supertest(BASE_URL)
            .put(`/users/${user.id}`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({
                email: user.email,
                avatar: user.avatar,
                password,
            })
            .expect(200);

        assert.exists(body.user, 'User undefined');
        assert.equal(body.user.id, user.id);

        await user.refresh();

        assert.isTrue(await Hash.verify(user.password, password));
    });

    test('it should return 422 when required update data is not provided', async (assert) => {
        const { id } = await UserFactory.create();

        const { body } = await supertest(BASE_URL)
            .put(`/users/${id}`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({})
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when an invalid update email is provided', async (assert) => {
        const { id, password, avatar } = await UserFactory.create();

        const { body } = await supertest(BASE_URL)
            .put(`/users/${id}`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({
                email: 'test@',
                password,
                avatar,
            })
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when provided update password is not a string', async (assert) => {
        const { id, email, avatar } = await UserFactory.create();

        const { body } = await supertest(BASE_URL)
            .put(`/users/${id}`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({
                password: 123,
                email,
                avatar,
            })
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when provided update password is a string, but has less than 4 char', async (assert) => {
        const { id, email, avatar } = await UserFactory.create();

        const { body } = await supertest(BASE_URL)
            .put(`/users/${id}`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({
                password: '123',
                email,
                avatar,
            })
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should return 422 when an invalid update avatar link is provided', async (assert) => {
        const { id, password, email } = await UserFactory.create();

        const { body } = await supertest(BASE_URL)
            .put(`/users/${id}`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({
                avatar: 'wasabi',
                password,
                email,
            })
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });


    group.before(async () => {
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
        token = apiToken.token;
    });

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });
});
