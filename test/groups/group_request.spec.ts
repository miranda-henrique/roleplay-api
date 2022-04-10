import Database from '@ioc:Adonis/Lucid/Database';
import GroupRequest from 'App/Models/GroupRequest';
import User from 'App/Models/User';
import { GroupFactory, UserFactory } from 'Database/factories';
import test from 'japa';
import supertest from 'supertest';


const BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`;
let globalToken = '';
let globalUser = {} as User;

test.group('Group request', (group) => {
    test('it should create a group request', async (assert) => {
        const master = await UserFactory.create();
        const group = await GroupFactory.merge({ master: master.id }).create();

        const { body } = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({
                'Authorization': `Bearer ${globalToken}`,
            })
            .send({})
            .expect(201);


        assert.exists(body.groupRequest, 'Group request not defined');
        assert.equal(body.groupRequest.userId, globalUser.id);
        assert.equal(body.groupRequest.groupId, group.id);
        assert.equal(body.groupRequest.status, 'PENDING');
    });

    test('it should return 409 when group request already exists', async (assert) => {
        const master = await UserFactory.create();
        const group = await GroupFactory.merge({ master: master.id }).create();

        await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({
                'Authorization': `Bearer ${globalToken}`,
            })
            .send({});

        const { body } = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({
                'Authorization': `Bearer ${globalToken}`,
            })
            .send({})
            .expect(409);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 409);
    });

    test('it should return 422 when user is already in the group', async (assert) => {
        const groupPayload = {
            name: 'testName',
            description: 'testDescription',
            schedule: 'testSchedule',
            location: 'testLocation',
            chronicle: 'testChronicle',
            master: globalUser.id,
        };

        //Master is added to group
        const { body: { group: createdGroup } } = await supertest(BASE_URL)
            .post('/groups')
            .set({
                'Authorization': `Bearer ${globalToken}`,
            })
            .send(groupPayload)
            .expect(201);

        const { body } = await supertest(BASE_URL)
            .post(`/groups/${createdGroup.id}/requests`)
            .set({
                'Authorization': `Bearer ${globalToken}`,
            })
            .send({})
            .expect(422);

        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should list group requests by master', async (assert) => {
        const plainTextPassword = 'testPassword';
        const master = await UserFactory.merge({ password: plainTextPassword }).create();
        const group = await GroupFactory.merge({ master: master.id }).create();

        const { email } = master;

        const { body: loginBody } = await supertest(BASE_URL)
            .post('/sessions')
            .send({ email: email, password: plainTextPassword })
            .expect(201);

        const apiToken = loginBody.token;
        const token = apiToken.token;

        const response = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({});

        const { body } = await supertest(BASE_URL)
            .get(`/groups/${group.id}/requests?master=${master.id}`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(200);


        await supertest(BASE_URL)
            .delete('/sessions')
            .set({ 'Authorization': `Bearer ${token}` });


        assert.exists(body.groupRequests, 'GroupRequests not defined');
        assert.equal(body.groupRequests.length, 1);
        assert.equal(body.groupRequests[0].id, response.body.groupRequest.id);
        assert.equal(body.groupRequests[0].userId, response.body.groupRequest.userId);
        assert.equal(body.groupRequests[0].groupId, response.body.groupRequest.groupId);
        assert.equal(body.groupRequests[0].status, response.body.groupRequest.status);
        assert.equal(body.groupRequests[0].group.name, group.name);
        assert.equal(body.groupRequests[0].user.username, master.username);
        assert.equal(body.groupRequests[0].group.master, master.id);
    });

    test('it should return an empty list when master has no group requests', async (assert) => {
        const plainTextPassword = 'testPassword';
        const master = await UserFactory.merge({ password: plainTextPassword }).create();
        const group = await GroupFactory.merge({ master: master.id }).create();

        const { email } = master;

        const { body: loginBody } = await supertest(BASE_URL)
            .post('/sessions')
            .send({ email: email, password: plainTextPassword })
            .expect(201);

        const apiToken = loginBody.token;
        const token = apiToken.token;

        const response = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({
                'Authorization': `Bearer ${token}`,
            })
            .send({});

        const { body } = await supertest(BASE_URL)
            .get(`/groups/${group.id}/requests?master=${globalUser.id}`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(200);

        await supertest(BASE_URL)
            .delete('/sessions')
            .set({ 'Authorization': `Bearer ${token}` });


        assert.exists(body.groupRequests, 'GroupRequests not defined');
        assert.equal(body.groupRequests.length, 0);
    });

    test('it should return 422 when master is not provided', async (assert) => {
        const master = await UserFactory.create();
        const group = await GroupFactory.merge({ master: master.id }).create();

        const { body } = await supertest(BASE_URL)
            .get(`/groups/${group.id}/requests`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(422);


        assert.equal(body.code, 'BAD_REQUEST');
        assert.equal(body.status, 422);
    });

    test('it should accept a group request', async (assert) => {
        const group = await GroupFactory.merge({ master: globalUser.id }).create();

        const { body } = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .send({});

        const response = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests/${body.groupRequest.id}/accept`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(200);


        assert.exists(response.body.groupRequest, 'GroupRequest not defined');
        assert.equal(response.body.groupRequest.userId, globalUser.id);
        assert.equal(response.body.groupRequest.status, 'ACCEPTED');

        await group.load('players');
        assert.isNotEmpty(group.players);
        assert.equal(group.players.length, 1);
        assert.equal(group.players[0].id, globalUser.id);
    });

    test('it should return 404 when providing a non-existent group', async (assert) => {
        const master = await UserFactory.create();
        const group = await GroupFactory.merge({ master: master.id }).create();
        const nonExistentGroup = '123';

        const { body } = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .send({});

        const response = await supertest(BASE_URL)
            .post(`/groups/${nonExistentGroup}/requests/${body.groupRequest.id}/accept`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(404);

        assert.equal(response.body.code, 'BAD_REQUEST');
        assert.equal(response.body.status, 404);
    });

    test('it should return 404 when providing a non-existent group request', async (assert) => {
        const master = await UserFactory.create();
        const group = await GroupFactory.merge({ master: master.id }).create();
        const nonExistentGroupRequest = '123';

        await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .send({});

        const response = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests/${nonExistentGroupRequest}/accept`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(404);


        assert.equal(response.body.code, 'BAD_REQUEST');
        assert.equal(response.body.status, 404);
    });

    test('it should reject a group request', async (assert) => {
        const group = await GroupFactory.merge({ master: globalUser.id }).create();

        const { body } = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .send({});

        await supertest(BASE_URL)
            .delete(`/groups/${group.id}/requests/${body.groupRequest.id}`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(200);

        const groupRequest = await GroupRequest.find(body.groupRequest.id);

        assert.isNull(groupRequest);
    });

    test('it should return 404 when providing a non-existent group for rejection', async (assert) => {
        const master = await UserFactory.create();
        const group = await GroupFactory.merge({ master: master.id }).create();
        const nonExistentGroup = '123';

        const { body } = await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .send({});

        const response = await supertest(BASE_URL)
            .delete(`/groups/${nonExistentGroup}/requests/${body.groupRequest.id}`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(404);

        assert.equal(response.body.code, 'BAD_REQUEST');
        assert.equal(response.body.status, 404);
    });

    test('it should return 404 when providing a non-existent group request for rejection', async (assert) => {
        const master = await UserFactory.create();
        const group = await GroupFactory.merge({ master: master.id }).create();
        const nonExistentGroupRequest = '123';

        await supertest(BASE_URL)
            .post(`/groups/${group.id}/requests`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .send({});

        const response = await supertest(BASE_URL)
            .delete(`/groups/${group.id}/requests/${nonExistentGroupRequest}`)
            .set({ 'Authorization': `Bearer ${globalToken}` })
            .expect(404);

        assert.equal(response.body.code, 'BAD_REQUEST');
        assert.equal(response.body.status, 404);
    });

    //////////// HOOKS ////////////////
    group.before(async () => {
        const plainTextPassword = 'testPassword';
        globalUser = await UserFactory.merge({ password: plainTextPassword }).create();
        const { email } = globalUser;

        const { body } = await supertest(BASE_URL)
            .post('/sessions')
            .send({ email: email, password: plainTextPassword })
            .expect(201);

        const apiToken = body.token;
        globalToken = apiToken.token;
    });

    group.after(async () => {
        await supertest(BASE_URL)
            .delete('/sessions')
            .set({
                'Authorization': `Bearer ${globalToken}`,
            });
    });

    group.beforeEach(async () => {
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await Database.rollbackGlobalTransaction();
    });
});