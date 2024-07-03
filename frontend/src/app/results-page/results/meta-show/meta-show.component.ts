import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'spoco-meta-show',
    templateUrl: './meta-show.component.html',
    styleUrls: ['./meta-show.component.scss']
})
export class MetaShowComponent implements OnInit {

    constructor() { }

    ngOnInit(): void {
        console.log ('meta:', this.meta);

    }

    @Input() meta: {name: string, value: string}[];
}
