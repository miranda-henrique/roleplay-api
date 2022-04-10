import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import BadRequestException from 'App/Exceptions/BadRequestException';
import Group from 'App/Models/Group';
import GroupRequest from 'App/Models/GroupRequest';


export default class GroupRequestsController {
    ///////////////////// INDEX ////////////////////////////
    public async index({ request, response }: HttpContextContract) {
        const { master } = request.qs();

        if (!master) throw new BadRequestException('Master user should be provided', 422);

        const groupRequests = await GroupRequest.query()
            .select('id', 'groupId', 'userId', 'status')
            .preload('group', (query) => {
                query.select('name', 'master');
            })
            .preload('user', (query) => {
                query.select('username');
            })
            .whereHas('group', (query) => {
                query.where('master', master);
            })
            .where('status', 'PENDING');

        return response.ok({ groupRequests });
    }

    ///////////////////// STORE ////////////////////////////
    public async store({ request, response, auth }: HttpContextContract) {
        if (!auth.user) return response.unauthorized();

        const groupId = request.param('groupId') as number;
        const userId = auth.user.id;

        const groupRequestAlreadyExists = await GroupRequest.query()
            .where('groupId', groupId)
            .andWhere('userId', userId)
            .first();

        if (groupRequestAlreadyExists) {
            throw new BadRequestException('group request already exists', 409);
        }

        const userAlreadyInTheGroup = await Group.query()
            .whereHas('players', (query) => {
                query.where('id', userId);
            })
            .andWhere('id', groupId)
            .first();

        if (userAlreadyInTheGroup) {
            throw new BadRequestException('user is already in the group', 422);
        }

        const groupRequest = await GroupRequest.create({ groupId, userId });
        await groupRequest.refresh();

        return response.created({ groupRequest });
    }

    ///////////////////// ACCEPT ////////////////////////////
    public async accept({ request, response, bouncer }: HttpContextContract) {
        const requestId = request.param('requestId');
        const groupId = request.param('groupId');

        const groupRequest = await GroupRequest.query()
            .where('id', Number(requestId))
            .andWhere('groupId', Number(groupId))
            .firstOrFail();

        await groupRequest.load('group');
        await bouncer.authorize('acceptGroupRequest', groupRequest);

        const updatedGroupRequest = await groupRequest.merge({ status: 'ACCEPTED' }).save();

        await groupRequest.load('group');
        await groupRequest.group.related('players').attach([groupRequest.userId]);

        return response.ok({ groupRequest: updatedGroupRequest });
    }

    ///////////////////// DESTROY ////////////////////////////
    public async destroy({ request, response, bouncer }: HttpContextContract) {
        const requestId = request.param('requestId');
        const groupId = request.param('groupId');

        const groupRequest = await GroupRequest.query()
            .where('id', Number(requestId))
            .andWhere('groupId', Number(groupId))
            .firstOrFail();

        await groupRequest.load('group');
        await bouncer.authorize('rejectGroupRequest', groupRequest);

        await groupRequest.delete();

        return response.ok({});
    }
}
