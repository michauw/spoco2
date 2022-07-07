import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ConfigService {

    constructor() { }

    configSettings: any = {};

    fetch (name: string) {
        return this.configSettings[name];
    }

    store (name: string, data: any) {
        this.configSettings[name] = data;
    }
}
