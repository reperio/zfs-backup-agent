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
                snapshot_name: Joi.string().required(),
                recursive: Joi.boolean().optional(),
                job_history_id: Joi.string().guid().required()
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
        const recursive = request.payload.recursive;
        const job_history_id = request.payload.job_history_id;

        logger.info(`${job_history_id} - Creating snapshot: ${snapshot_name}`);

        const api = new zfs_api(logger);

        const status_code = await api.create_snapshot(snapshot_name, recursive);

        logger.info(`${job_history_id} - Create snapshot finished with code: ${status_code}`);

        return reply({message:'success', status_code: status_code});
    }
    catch (e) {
        request.server.app.logger.error(e);

        return reply(Boom.badImplementation('Snapshot create failed.'));
    }
}

routes.push({
    method: ['POST'],
    path: '/zfs/destroy_snapshot',
    handler: destroy_snapshot,
    config: {
        cors: true,
        validate: {
            payload: {
                snapshot_name: Joi.string().required(),
                job_history_id: Joi.string().guid().required()
            }
        }
    }
});
async function destroy_snapshot(request, reply) {
    const logger = request.server.app.logger;

    try {
        const payload = JSON.stringify(request.payload);
        logger.info(`destroy_snapshot called with payload: ${payload}`);

        const snapshot_name = request.payload.snapshot_name;
        const job_history_id = request.payload.job_history_id;

        logger.info(`${job_history_id} - Destroying snapshot: ${snapshot_name}`);

        const api = new zfs_api(logger);

        const status_code = await api.destroy_snapshot(snapshot_name);

        logger.info(`${job_history_id} - Destroy snapshot finished with code: ${status_code}`);

        return reply({message:'success', status_code: status_code});
    }
    catch (e) {
        request.server.app.logger.error(e);

        return reply(Boom.badImplementation('Snapshot destroy failed.'));
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
                include_properties: Joi.boolean().required(),
                source_snapshot_name: Joi.string().when('incremental', {
                    is: true,
                    then: Joi.required()
                }),
                mbuffer_size: Joi.string().optional(),
                mbuffer_rate: Joi.string().optional(),
                job_history_id: Joi.string().guid().required()
            }
        }
    }
});
async function send_snapshot(request, reply) {
    const logger = request.server.app.logger;
    const config = request.server.app.config;

    try {
        const payload = JSON.stringify(request.payload);
        logger.info(`send_snapshot called with payload: ${payload}`);

        const snapshot_name = request.payload.snapshot_name;
        const host = request.payload.host;
        const port = request.payload.port;
        const incremental = request.payload.incremental;
        const include_properties = request.payload.include_properties;
        const source_snapshot_name = request.payload.source_snapshot_name;
        const mbuffer_size = request.payload.mbuffer_size || config.mbuffer_size;
        const mbuffer_rate = request.payload.mbuffer_rate || config.mbuffer_rate;
        const job_history_id = request.payload.job_history_id;

        logger.info(`${job_history_id} - Sending snapshot: ${snapshot_name} to ${host}:${port}`);

        const api = new zfs_api(logger);

        api.send_mbuffer_to_host(snapshot_name, host, port, incremental, include_properties, source_snapshot_name, mbuffer_size, mbuffer_rate).then(function(code) {
            request.server.app.logger.info(`${job_history_id} - Send snapshot finished with code: ${code}`);
            //notify server of success
            await request.server.app.controller_api.notify_send_complete(job_history_id, code);
        }).catch(function(code) {
            request.server.app.logger.error(`${job_history_id} - Send snapshot failed with error: ${code}`);
            //notify server of failure
            await request.server.app.controller_api.notify_send_complete(job_history_id, code);
        });

        logger.info(`${job_history_id} - Send command executed.`);

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
                port: Joi.number().required(),
                force_rollback: Joi.boolean().optional(),
                job_history_id: Joi.string().guid().required()
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
        const force_rollback = request.payload.force_rollback;
        const job_history_id = request.payload.job_history_id;

        logger.info(`${job_history_id} - Receiving snapshot: ${target} on port ${port}`);

        const api = new zfs_api(logger);

        api.receive_mbuffer_to_zfs_receive(target, port, force_rollback).then(function(code) {
            logger.info(`${job_history_id} - Receive snapshot finished with code: ${code}`);
            await request.server.app.controller_api.notify_receive_complete(job_history_id, code);
        }).catch(function(code) {
            logger.error(`${job_history_id} - Receive snapshot finished with code: ${code}`);
            await request.server.app.controller_api.notify_receive_complete(job_history_id, code);
        });

        return reply({message:'success', status_code: 0});
    }
    catch (e) {
        logger.error(e);

        return reply(Boom.badImplementation('Snapshot receive failed.'));
    }
}

module.exports = routes;