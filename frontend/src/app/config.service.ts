import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ConfigService {

    constructor() { }

    configSettings: any = {};   // TODO: type

    fetch (name: string, from_local_storage = false) {
        if (from_local_storage) {
            const stored = localStorage.getItem (name);
            if (stored)
                return JSON.parse (stored);
        }
        return this.configSettings[name];
    }

    is_set (name: string) {
        return this.configSettings.hasOwnProperty (name);
    }

    store (name: string, data: any, local_storage = false) {
        this.configSettings[name] = data;
        if (local_storage)
            localStorage.setItem (name, JSON.stringify (data));
    }
}
