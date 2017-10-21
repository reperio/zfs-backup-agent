const fs = require('fs');
const cp = require('child_process');
const spawn = cp.spawn;

//process = child_process.spawn('sh', ['-c', 'unoconv -f pdf --stdout sample.doc | pdftotext -layout -enc UTF-8 - out.txt']);

class ZFSApi {
	constructor() {
		
	}

	create_snapshot(snapshot_name) {
		const promise = new Promise((resolve, reject) => {
			console.log('spawning zfs snapshot');

			const child = spawn('zfs', ['snapshot', snapshot_name]);

			child.addListener('exit', function(code){
				console.log(`Snapshot create complete: ${code}`);

				if (code === 0) {
					resolve(code);
				} else {
					reject(code);
				}
			});
		});
		
		return promise;
	}

	send_file(snapshot_name, file_name) {
		const promise = new Promise((resolve, reject) => {
			console.log('spawning zfs send to file');

			const file = fs.createWriteStream(file_name);
			
			const child = spawn('zfs', ['send', snapshot_name]);
			
			child.stdout.pipe(file);
			
			child.addListener('exit', function (code) {
				console.log(`Send complete: ${code}`);
				if (code === 0) {
					resolve(code);
				} else {
					reject(code);
				}
			});
		});
		
		return promise;
	}

	send_mbuffer_to_host(snapshot_name, host, port, incremental, source_snapshot_name) {
		const promise = new Promise((resolve, reject) => {
			console.log('spawning zfs send to mbuffer');

			const zfs_args = ['send'];

			if (incremental) {
				zfs_args.push('-I', source_snapshot_name);
			}

			zfs_args.push(snapshot_name);

			const zfs_send = spawn('zfs', zfs_args);
			const mbuffer = spawn('mbuffer', ['-O', `${host}:${port}`]);

			zfs_send.stdout.pipe(mbuffer.stdin);

			mbuffer.stdout.pipe(process.stdout);
			mbuffer.stderr.pipe(process.stderr);

			zfs_send.addListener('exit', function (code) {
				console.log(`Send complete: ${code}`);

				if (code === 0) {
					resolve(code);
				} else {
					reject(code);
				}
			});
		});
		
		return promise;
	}

	receive_mbuffer_to_file(file_name, port) {
		const promise = new Promise((resolve, reject) => {
			console.log('spwaning mbuffer to receive to file');

			const file = fs.createWriteStream(file_name);

			const child = spawn('mbuffer', ['-I', port, '-o', file_name]);

			child.stdout.pipe(file);

			child.addListener('exit', function(code){
				console.log(`Receive complete: ${code}`);
				
				if (code === 0) {
					resolve(code);
				} else {
					reject(code);
				}
			});
		});
		
		return promise;
	}

	receive_mbuffer_to_zfs_receive(receive_target, port) {
		const promise = new Promise((resolve, reject) => {
			console.log('spawning mbuffer to receive to zfs receive');

			const zfs_receive = spawn('zfs', ['receive', receive_target]);
			const mbuffer = spawn('mbuffer', ['-I', port]);

			mbuffer.stdout.pipe(zfs_receive.stdin);

			zfs_receive.stdout.pipe(process.stdout);
			zfs_receive.stderr.pipe(process.stderr);

			zfs_receive.addListener('exit', function(code){
				console.log(`Receive complete: ${code}`);

				if (code === 0) {
					resolve(code);
				} else {
					reject(code);
				}
			});
		});
		
		return promise;
	}
}

module.exports = ZFSApi;


