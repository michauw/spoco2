export const environment = {
    production: true,
    host: {
        url: 'backend',
        port: '8000'
    }
};

export const BASE_URL = `http://${environment.host.url}:${environment.host.port}/api`;
// export const CONFIG_FILE = 'config.json'


