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

		this.zpool_command = 'zpool';

		this.mbuffer_command = 'mbuffer';
	}

	log_command(command, args) {
		const arg_string = args.join(' ');

		this.logger.info(`Executing: '${command} ${arg_string}'`);
	}

	add_listeners(process, resolve, reject) {
		var self = this;

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
			self.logger.info(`DISCONNECT`);
		});

		process.addListener('message', function (message) {
			self.logger.info(`MESSAGE: ${message}`);
		});
	}

	create_snapshot(snapshot_name) {
		const promise = new Promise((resolve, reject) => {
			const command = this.zfs_command;
			const command_args = [this.zfs_snapshot, snapshot_name];

			this.log_command(command, command_args);

			const child = spawn(command, command_args);

			this.add_listeners(child, resolve, reject);
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

			this.add_listeners(child, resolve, reject);
		});
		
		return promise;
	}

	send_mbuffer_to_host(snapshot_name, host, port, incremental, source_snapshot_name, mbuffer_size) {
		const self = this;

		const promise = new Promise((resolve, reject) => {
			const zfs_command = this.zfs_command;
			const zfs_command_args = [this.zfs_send];

			if (incremental) {
				zfs_command_args.push('-I', source_snapshot_name);
			}

			zfs_command_args.push(snapshot_name);

			const mbuffer_command = this.mbuffer_command;
			const mbuffer_command_args = ['-O', `${host}:${port}`, '-m', mbuffer_size];

			this.log_command(zfs_command, zfs_command_args);
			this.log_command(mbuffer_command, mbuffer_command_args);

			const zfs_send = spawn(zfs_command, zfs_command_args);
			const mbuffer = spawn(mbuffer_command, mbuffer_command_args);

			zfs_send.stdout.pipe(mbuffer.stdin);

			mbuffer.stdout.pipe(process.stdout);
			mbuffer.stderr.pipe(process.stderr);

			this.add_listeners(zfs_send, resolve, reject);
		});
		
		return promise;
	}

	receive_mbuffer_to_file(file_name, port) {
		const promise = new Promise((resolve, reject) => {
			const file = fs.createWriteStream(file_name);

			const mbuffer_command = this.mbuffer_command;
			const mbuffer_command_args = ['-I', port, '-o', file_name];

			this.log_command(mbuffer_command, mbuffer_command_args);

			const child = spawn(mbuffer_command, mbuffer_command_args);

			child.stdout.pipe(file);

			this.add_listeners(child, resolve, reject);
		});
		
		return promise;
	}

	receive_mbuffer_to_zfs_receive(receive_target, port) {
		const promise = new Promise((resolve, reject) => {
			const zfs_command = this.zfs_command;
			const zfs_command_args = [this.zfs_receive, receive_target];

			const mbuffer_command = this.mbuffer_command;
			const mbuffer_command_args = ['-I', port];

			this.log_command(zfs_command, zfs_command_args);
			this.log_command(mbuffer_command, mbuffer_command_args);

			const zfs_receive = spawn(zfs_command, zfs_command_args);
			const mbuffer = spawn(mbuffer_command, mbuffer_command_args);

			mbuffer.stdout.pipe(zfs_receive.stdin);

			zfs_receive.stdout.pipe(process.stdout);
			zfs_receive.stderr.pipe(process.stderr);

			this.add_listeners(zfs_receive, resolve, reject);
		});
		
		return promise;
	}
}

module.exports = ZFSApi;


