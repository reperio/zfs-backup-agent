module.exports = {
    log_directory: '/opt/zfs-backup-agent/logs',
    trace_log_level: 'info',
    app_file_log_level: 'info',
    app_json_log_level: 'info',
    host: '0.0.0.0',
    port: 3000,
    mbuffer_size: '1G',
    mbuffer_rate: '1G',
    controller_api_url: 'http://172.20.33.253:3000/api'
};