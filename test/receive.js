const zfs_api = require('../zfs_api');

const api = new zfs_api();


async function execute() {
	try {
		console.log('receiving snapshot');

		await api.receive_mbuffer_to_zfs_receive('dev2/dev1', 1234);
		//await api.receive_mbuffer_to_file('/development/images/dev1snap1', 1234);

		console.log('finished receiving snapshot');
	} catch(err) {
		console.log('failed to receive snapshot');
		console.log(err);
	}
};

execute();

