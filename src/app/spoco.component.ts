import { Component, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'spoco-root',
    templateUrl: './spoco.component.html',
    styleUrls: ['./spoco.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class SpocoComponent {
    title = 'spoco';
}
