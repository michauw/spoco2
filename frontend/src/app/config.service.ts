import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ConfigService {

    constructor() { }

    configSettings: any = {};   // TODO: type

    fetch (name: string) {
        if (!this.configSettings.hasOwnProperty (name))
            return [];
        return this.configSettings[name];
    }

    is_set (name: string) {
        return this.configSettings.hasOwnProperty (name);
    }

    store (name: string, data: any) {
        this.configSettings[name] = data;
    }
}
