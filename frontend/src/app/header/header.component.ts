import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';
import { ConfigService } from '../config.service';
import { PreferencesObj } from '../dataTypes';

@Component({
    selector: 'spoco-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    standalone: false
})
export class HeaderComponent implements OnInit {
    
    name: string;
    preferences: PreferencesObj;

    constructor (private route: ActivatedRoute, private config: ConfigService) { }

    ngOnInit(): void {
        this.route.data.subscribe (     // loading settings from settings/config.json and storing them in configService (shouldn't be in the query-page component?)
            (data: Data) => { 
                this.name = this.config.fetch ('projectName');
                if (!this.property_set (this.name)) {
                    this.name = data['config']['projectName'];
                    this.config.store ('projectName', this.name);
                }
                this.preferences = this.config.fetch ('preferences');
                if (!this.property_set (this.preferences)) {
                    this.preferences = data['preferences'];
                    this.config.store ('preferences', this.preferences);
                }
            });
    }

    private property_set (element: any) {
        if (Array.isArray (element))
            return element.length > 0;
        return Boolean (element);
    }
}
