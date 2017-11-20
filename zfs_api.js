const fs = require('fs');
const cp = require('child_process');
const spawn = cp.spawn;

class ZFSApi {
    constructor(logger) {
        this.logger = logger;

        this.zfs_command = 'zfs';
        this.zfs_send = 'send';
        this.zfs_receive = 'receive';
        this.zfs_snapshot = 'snapshot';
        this.zfs_destroy = 'destroy';

        this.zpool_command = 'zpool';

        this.mbuffer_command = 'mbuffer';
    }

    log_command(command, args) {
        const arg_string = args.join(' ');

        this.logger.info(`Executing: '${command} ${arg_string}'`);
    }

    add_listeners(process, resolve, reject, capture_output) {
        /* eslint consistent-this: 0 */
        const self = this;
        let stdout = '';
        let stderr = '';

        if (capture_output) {
            process.stdout.on('data', function(chunk) {
                stdout += chunk;
            });
            
            process.stdout.on('end', function() {
                self.logger.info('STDOUT');
                self.logger.info(stdout);
                self.logger.info();
            });

            process.stderr.on('data', function(chunk) {
                stderr += chunk;
            });
            
            process.stderr.on('end', function() {
                self.logger.info('STDERR');
                self.logger.info(stderr);
                self.logger.info();
            });
        }

        process.addListener('exit', function (code, signal) {
            self.logger.info(`EXIT: ${code} | ${signal}`);

            if (code === 0) {
                resolve(code);
            } else {
                reject(code);
            }
        });

        process.addListener('error', function (err) {
            self.logger.error(`ERROR: ${err}`);

            reject(err);
        });

        process.addListener('close', function (code, signal) {
            self.logger.info(`CLOSE: ${code} | ${signal}`);
        });

        process.addListener('disconnect', function () {
            self.logger.info('DISCONNECT');
        });

        process.addListener('message', function (message) {
            self.logger.info(`MESSAGE: ${message}`);
        });
    }

    create_snapshot(snapshot_name, recursive) {
        const promise = new Promise((resolve, reject) => {
            const command = this.zfs_command;
            const command_args = [this.zfs_snapshot];

            if (recursive) {
                command_args.push('-r');
            }

            command_args.push(snapshot_name);

            this.log_command(command, command_args);

            const child = spawn(command, command_args);

            this.add_listeners(child, resolve, reject, false);
        });

        return promise;
    }

    destroy_snapshot(snapshot_name) {
        const promise = new Promise((resolve, reject) => {
            const command = this.zfs_command;
            const command_args = [this.zfs_destroy, snapshot_name];

            this.log_command(command, command_args);

            const child = spawn(command, command_args);

            this.add_listeners(child, resolve, reject, false);
        });

        return promise;
    }

    send_to_file(snapshot_name, file_name) {
        const promise = new Promise((resolve, reject) => {
            const file = fs.createWriteStream(file_name);

            const command = this.zfs_command;
            const command_args = [this.zfs_send, snapshot_name];

            this.log_command(command, command_args);

            const child = spawn(command, command_args);

            child.stdout.pipe(file);

            this.add_listeners(child, resolve, reject, false);
        });

        return promise;
    }

    /* eslint max-params: 0 */
    send_mbuffer_to_host(snapshot_name, host, port, incremental, include_properties, source_snapshot_name, mbuffer_size, mbuffer_rate) {
        const zfs_promise = new Promise((resolve, reject) => {
            const mbuffer_promise = new Promise((mbuffer_resolve, mbuffer_reject) => {
                const zfs_command = this.zfs_command;
                const zfs_command_args = [this.zfs_send];

                if (incremental) {
                    zfs_command_args.push('-I', source_snapshot_name);
                }

                if (!incremental && include_properties) {
                    zfs_command_args.push('-p');
                }

                zfs_command_args.push(snapshot_name);

                const mbuffer_command = this.mbuffer_command;

                const mbuffer_command_args = ['-O', `${host}:${port}`, '-m', mbuffer_size, '-r', mbuffer_rate];
                this.log_command(zfs_command, zfs_command_args);
                this.log_command(mbuffer_command, mbuffer_command_args);

                const zfs_send = spawn(zfs_command, zfs_command_args);
                const mbuffer = spawn(mbuffer_command, mbuffer_command_args);

                zfs_send.stdout.pipe(mbuffer.stdin);

                //mbuffer.stdout.pipe(process.stdout);
                //mbuffer.stderr.pipe(process.stderr);

                this.add_listeners(zfs_send, resolve, reject, false);
                this.add_listeners(mbuffer, mbuffer_resolve, mbuffer_reject, true);
            });
        });

        return zfs_promise;
    }

    receive_mbuffer_to_file(file_name, port) {
        const promise = new Promise((resolve, reject) => {
            const file = fs.createWriteStream(file_name);

            const mbuffer_command = this.mbuffer_command;
            const mbuffer_command_args = ['-I', port, '-o', file_name];

            this.log_command(mbuffer_command, mbuffer_command_args);

            const child = spawn(mbuffer_command, mbuffer_command_args);

            child.stdout.pipe(file);

            this.add_listeners(child, resolve, reject, false);
        });

        return promise;
    }

    receive_mbuffer_to_zfs_receive(receive_target, port, force_rollback, mbuffer_size, mbuffer_rate) {
        const promise = new Promise((resolve, reject) => {
            const mbuffer_promise = new Promise((mbuffer_resolve, mbuffer_reject) => {
                const zfs_command = this.zfs_command;
                const zfs_command_args = [this.zfs_receive];

                if (force_rollback) {
                    zfs_command_args.push('-F');
                }

                zfs_command_args.push(receive_target);

                const mbuffer_command = this.mbuffer_command;
                const mbuffer_command_args = ['-I', port, '-m', mbuffer_size, '-r', mbuffer_rate];

                this.log_command(zfs_command, zfs_command_args);
                this.log_command(mbuffer_command, mbuffer_command_args);

                const zfs_receive = spawn(zfs_command, zfs_command_args);
                const mbuffer = spawn(mbuffer_command, mbuffer_command_args);

                mbuffer.stdout.pipe(zfs_receive.stdin);

                zfs_receive.stdout.pipe(process.stdout);
                zfs_receive.stderr.pipe(process.stderr);

                this.add_listeners(zfs_receive, resolve, reject, true);
                this.add_listeners(mbuffer, mbuffer_resolve, mbuffer_reject, false);
            });
        });

        return promise;
    }
}

module.exports = ZFSApi;


