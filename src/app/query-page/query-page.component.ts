import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';
import { ConfigService } from '../config.service';

@Component({
    selector: 'spoco-query-page',
    templateUrl: './query-page.component.html',
    styleUrls: ['./query-page.component.scss']
})
export class QueryPageComponent implements OnInit {

    constructor(private route: ActivatedRoute, private configService: ConfigService) { }

    ngOnInit(): void {
        this.route.data.subscribe (
            (data: Data) => { 
                this.configService.store ('positionalAttributes', data['config']['positionalAttributes']);
                this.configService.store ('modifiers', data['config']['modifiers']);
            }
        );
    }

}
