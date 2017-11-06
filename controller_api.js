const request = require('request-promise-native');

class ControllerApi {
	constructor(config, logger) {
		this.config = config;
		this.logger = logger;

        this.urls = {
            notify_send_complete: '/zfs/send_complete'
        }
	}

	async notify_send_complete(job_history_id, code) {
		const http_options = {
            uri: this.urls.notify_send_complete,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            json: {job_history_id: job_history_id, code: code}
        };

        try {
        	const result = await request(http_options);

        	return true;
        } catch(err) {

        	this.logger(err);

        	throw err;
        }
	}
}

module.exports = ControllerApi;


