import test from 'japa';
import supertest from 'supertest';
import Database from '@ioc:Adonis/Lucid/Database';
import { UserFactory } from 'Database/factories';
import User from 'App/Models/User';


const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`;
let token = '';
let globalUser = {} as User;

test.group('Group', (group) => {
    test('it should create a group', async (assert) => {
        const user = await UserFactory.create();
        const groupPayload = {
            name: 'testTable',
            description: 'testDescription',
            schedule: 'testSchedule',
            location: 'testLocation',
            chronicle: 'testChronicle',
            master: user.id,
        };

        const { body } = await supertest(BASE_URL)
            .post('/groups')
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send(groupPayload)
            .expect(201);

        assert.exists(body.group, 'Group not defined');
        assert.equal(body.group.name, groupPayload.name);
        assert.equal(body.group.description, groupPayload.description);
        assert.equal(body.group.schedule, groupPayload.schedule);
        assert.equal(body.group.location, groupPayload.location);
        assert.equal(body.group.chronicle, groupPayload.chronicle);
        assert.equal(body.group.master, groupPayload.master);

        //assert that the master has been inserted as a player in the group
        //by default, whoever creates the group is also its master
        assert.exists(body.group.players, 'Players not defined');
        assert.equal(body.group.players.length, 1);
        assert.equal(body.group.players[0].id, groupPayload.master);

    });

    test('it should return 422 when required data is not provided', async (assert) => {
        const { body } = await supertest(BASE_URL)
            .post('/groups')
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({})
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });


    group.before(async () => {
        const plainTextPassword = 'testPassword';
        globalUser = await UserFactory.merge({ password: plainTextPassword }).create();
        const { email } = globalUser;

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

    group.after(async () => {
        await supertest(BASE_URL)
            .delete('/sessions')
            .set({
                'Authorization': `Bearer ${token}`,
            });
    });

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });
});