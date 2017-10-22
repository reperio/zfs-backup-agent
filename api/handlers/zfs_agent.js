'use strict';

const Boom = require('boom');
const Joi = require('joi');

const zfs_api = require('../../zfs_api');

const routes = [];

routes.push({
    method: ['POST'],
    path: '/zfs/create_snapshot',
    handler: create_snapshot,
    config: {
        cors: true,
        validate: {
            payload: {
                snapshot_name: Joi.string().required()
            }
        }
    }
});
async function create_snapshot(request, reply) {
    const logger = request.server.app.logger;

    try {
        const payload = JSON.stringify(request.payload);
        logger.info(`create_snapshot called with payload: ${payload}`);

        const snapshot_name = request.payload.snapshot_name;

        logger.info(`Creating snapshot: ${snapshot_name}`);

        const api = new zfs_api(logger);

        const status_code = await api.create_snapshot(snapshot_name);

        logger.info(`Create snapshot finished with code: ${status_code}`);

        return reply({message:'success', status_code: status_code});
    }
    catch (e) {
        request.server.app.logger.error(e);

        return reply(Boom.badImplementation('Snapshot create failed.'));
    }
}

routes.push({
    method: ['POST'],
    path: '/zfs/send_snapshot',
    handler: send_snapshot,
    config: {
        cors: true,
        validate: {
            payload: {
                snapshot_name: Joi.string().required(),
                host: Joi.string().required(),
                port: Joi.number().required(),
                incremental: Joi.boolean().required(),
                source_snapshot_name: Joi.string().when('incremental', {
                    is: true,
                    then: Joi.required()
                }),
                mbuffer_size: Joi.string().optional()
            }
        }
    }
});
async function send_snapshot(request, reply) {
    const logger = request.server.app.logger;

    try {
        const payload = JSON.stringify(request.payload);
        logger.info(`send_snapshot called with payload: ${payload}`);

        const snapshot_name = request.payload.snapshot_name;
        const host = request.payload.host;
        const port = request.payload.port;
        const incremental = request.payload.incremental;
        const source_snapshot_name = request.payload.source_snapshot_name;
        const mbuffer_size = request.payload.mbuffer_size || Config.mbuffer_size;

        logger.info(`Sending snapshot: ${snapshot_name} to ${host}:${port}`);

        const api = new zfs_api(logger);

        api.send_mbuffer_to_host(snapshot_name, host, port, incremental, source_snapshot_name, mbuffer_size).then(function(code) {
            request.server.app.logger.info(`Send snapshot finished with code: ${code}`);
        }).catch(function(code) {
            request.server.app.logger.error(`Send snapshot failed with error: ${code}`);
        });

        logger.info(`Send command executed.`);

        return reply({message:'success', status_code: 0});
    }
    catch (e) {
        logger.error(e);

        return reply(Boom.badImplementation('Snapshot send failed.'));
    }
}

routes.push({
    method: ['POST'],
    path: '/zfs/receive_snapshot',
    handler: receive_snapshot,
    config: {
        cors: true,
        validate: {
            payload: {
                target: Joi.string().required(),
                port: Joi.number().required()
            }
        }
    }
});
async function receive_snapshot(request, reply) {
    const logger = request.server.app.logger;

    try {
        const payload = JSON.stringify(request.payload);
        logger.info(`receive_snapshot called with payload: ${payload}`);

        const target = request.payload.target;
        const port = request.payload.port;

        logger.info(`Receiving snapshot: ${target} on port ${port}`);

        const api = new zfs_api(logger);

        api.receive_mbuffer_to_zfs_receive(target, port).then(function(code) {
            logger.info(`Receive snapshot finished with code: ${code}`);
        }).catch(function(code) {
            logger.error(`Receive snapshot finished with code: ${code}`);
        });

        return reply({message:'success', status_code: 0});
    }
    catch (e) {
        logger.error(e);

        return reply(Boom.badImplementation('Snapshot receive failed.'));
    }
}

module.exports = routes;