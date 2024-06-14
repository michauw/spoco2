export const environment = {
    production: true,
    host: {
        url: 'fastapi',
        port: '8000'
    }
};

export const BASE_URL = `https://${environment.host.url}:${environment.host.port}`;
export const CONFIG_FILE = 'config.json'


