import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'spoco-meta-show',
    templateUrl: './meta-show.component.html',
    styleUrls: ['./meta-show.component.scss'],
    standalone: false
})
export class MetaShowComponent {

    constructor() { }

    @Input() meta: {name: string, value: string}[];
}
