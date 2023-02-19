import { Component, OnInit } from '@angular/core';
import { faExchangeAlt, faInfoCircle, faEye, faDownload } from '@fortawesome/free-solid-svg-icons';
import { faSquareCheck } from '@fortawesome/free-regular-svg-icons';
import { ActionService } from 'src/app/action.service';

@Component({
    selector: 'spoco-action-box',
    templateUrl: './action-box.component.html',
    styleUrls: ['./action-box.component.scss']
})
export class ActionBoxComponent implements OnInit {

    constructor(private actions: ActionService) { }

    ngOnInit(): void {
        
    }

    exchange = {icon: faExchangeAlt, enabled: true};
    info = {icon: faInfoCircle, enabled: false};
    eye = {icon: faEye, enabled: true};
    checkbox = {icon: faSquareCheck, enabled: true};
    download = {icon: faDownload, enabled: true};

    onClick (name: string) {
        if (name == 'info')
            this.info.enabled = !this.info.enabled;
    }

    switchDisplayMode () {
        this.actions.switchDisplayMode ();
    }

    switchMeta () {
        this.actions.switchShowMeta ();
        this.info.enabled = !this.info.enabled;
    }

}
