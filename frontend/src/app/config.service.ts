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

    store (name: string, data: any) {
        this.configSettings[name] = data;
    }
}
