import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';
import { ConfigService } from '../config.service';

@Component({
    selector: 'spoco-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

    constructor (private route: ActivatedRoute, private config: ConfigService) { }

    ngOnInit(): void {
        this.route.data.subscribe (     // loading settings from settings/config.json and storing them in configService (shouldn't be in the query-page component?)
            (data: Data) => { 
                this.name = data['config']['projectName'];
                this.config.store ('projectName', this.name);
            });
            
    }

    name: string;

}
