const request = require('request-promise-native');

class ControllerApi {
	constructor(config, logger) {
		this.config = config;
		this.logger = logger;
	}

	async notify_send_complete() {
		const http_options = {
            uri: this.url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            json: {}
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


