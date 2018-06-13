const request = require('request-promise-native');

class ControllerApi {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;

        this.urls = {
            notify_send_complete: '/zfs/send_complete',
            notify_receive_complete: '/zfs/receive_complete',
            notify_destroy_complete: 'zfs/destroy_complete'
        };
    }

    async notify_send_complete(job_history_id, code) {
        this.logger.info(`${job_history_id} - notifying controller for send complete: ${code}`);

        const http_options = {
            uri: `${this.config.controller_api_url}${this.urls.notify_send_complete}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            json: {job_history_id: job_history_id, code: code}
        };

        try {
            const result = await request(http_options);
            this.logger.info(`${job_history_id} - notification complete`);

            return true;
        } catch(err) {
            this.logger.error(err);

            throw err;
        }
    }

    async notify_receive_complete(job_history_id, code) {
        this.logger.info(`${job_history_id} - notifying controller for send complete: ${code}`);

        const http_options = {
            uri: `${this.config.controller_api_url}${this.urls.notify_receive_complete}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            json: {job_history_id: job_history_id, code: code}
        };

        try {
            const result = await request(http_options);
            this.logger.info(`${job_history_id} - notification complete`);

            return true;
        } catch(err) {
            this.logger.error(err);

            throw err;
        }
    }

    async notify_destroy_complete(job_history_id, code, host_id) {
        this.logger.info(`${job_history_id} - notifying controller for destroy complete: ${code}`);

        const http_options = {
            uri: `${this.config.controller_api_url}${this.urls.notify_destroy_complete}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            json: {job_history_id: job_history_id, code: code, host_id: host_id}
        };

        try {
            const result = await request(http_options);
            this.logger.info(`${job_history_id} - notification complete`);

            return true;
        } catch(err) {
            this.logger.error(err);

            throw err;
        }
    }
}

module.exports = ControllerApi;


