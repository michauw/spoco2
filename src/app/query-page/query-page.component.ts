import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';

@Component({
    selector: 'spoco-query-page',
    templateUrl: './query-page.component.html',
    styleUrls: ['./query-page.component.scss']
})
export class QueryPageComponent implements OnInit {

    constructor(private route: ActivatedRoute) { }

    ngOnInit(): void {
        this.route.data.subscribe (
            (data: Data) => { 
                console.log('resolved', data) 
            }
        );
    }

}
