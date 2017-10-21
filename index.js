'use strict';

const Config = require('./config');
const Hapi = require('hapi');
const moment = require("moment");

const winston = require('winston');
require('winston-daily-rotate-file');

// Create a server with a host and port
const server = new Hapi.Server({});
server.connection({
    host: Config.agent.host,
    port: Config.agent.port
});

server.app.config = Config;

const log_directory = Config.agent.log_directory;

const app_file_transport = new (winston.transports.DailyRotateFile)({
	name: 'file_transport',
    filename: `${log_directory}/log`,
    datePattern: 'agent-app-yyyy-MM-dd.',
    prepend: true,
    level: Config.agent.app_file_log_level,
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: false
});

const app_json_transport = new (winston.transports.DailyRotateFile)({
	name: 'json_transport',
    filename: `${log_directory}/log`,
    datePattern: 'agent-json-yyyy-MM-dd.',
    prepend: true,
    level: Config.agent.app_json_log_level,
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: true
});

const trace_file_transport = new (winston.transports.DailyRotateFile)({
    filename: `${log_directory}/log`,
    datePattern: 'agent-trace-yyyy-MM-dd.',
    prepend: true,
    level: Config.agent.trace_log_level,
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: true
});

const console_transport = new (winston.transports.Console)({
    prepend: true,
    level: Config.log_level,
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: false,
    colorize: true
});

const app_logger = new (winston.Logger)({
    transports: [
      app_file_transport,
      app_json_transport,
      console_transport
    ]
});

const trace_logger = new (winston.Logger)({
    transports: [
      trace_file_transport,
      console_transport
    ]
});

server.app.logger = app_logger;
server.app.trace_logger = trace_logger;

server.register({
    register: require("./api")
}, {
    routes: {
        prefix: "/api"
    }
}, (err) => {
    if (err) {
        console.error(err);
    }
});

//make sure unhandled exceptions are logged
server.on('request-error', (request, response) => {
        request.server.app.logger.error(response);
    }
);


server.ext({
    type: "onPreResponse",
    method: async (request, reply) => {
        const response = request.response;

        if (response.isBoom) {
            request.server.app.trace_logger.info({
                path:request.route.path, 
                method: request.route.method, 
                fingerprint: request.route.fingerprint, 
                code: response.output.statusCode,
                payload: response.output.payload
            });
        } else {
            request.server.app.trace_logger.info({
                path:request.route.path, 
                method: request.route.method, 
                fingerprint: request.route.fingerprint, 
                code: response.statusCode,
                payload: response.payload
            });
        }

        await reply.continue();
    }
});


server.start(err => {
    if (err) {
    	console.log(err);
        throw err;
    }
    console.log('Server running at:', server.info.uri);
});



module.exports = server;
