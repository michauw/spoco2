import { Component, OnInit } from '@angular/core';
import { faExchangeAlt, faInfoCircle, faEye, faDownload, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faSquareCheck } from '@fortawesome/free-regular-svg-icons';
import { ActionService } from 'src/app/action.service';
import { ConfigService } from 'src/app/config.service';

type IconControl = {icon: IconDefinition, enabled: boolean, show: boolean};

@Component({
    selector: 'spoco-action-box',
    templateUrl: './action-box.component.html',
    styleUrls: ['./action-box.component.scss']
})
export class ActionBoxComponent implements OnInit {

    constructor(private actions: ActionService, private config: ConfigService) { }

    ngOnInit(): void {
        const layers = this.config.fetch ('layers');
        this.exchange = {icon: faExchangeAlt, enabled: true, show: true};
        this.info = {icon: faInfoCircle, enabled: false, show: true};
        this.layers = {icon: faEye, enabled: true, show: layers.length > 1};
        this.download_selected = {icon: faSquareCheck, enabled: true, show: true};
        this.download_all = {icon: faDownload, enabled: true, show: true};
    }

    exchange: IconControl;
    info: IconControl;
    layers: IconControl;
    download_selected: IconControl;
    download_all: IconControl;

    onClick (name: string) {
        if (name == 'info')
            this.info.enabled = !this.info.enabled;
    }

    switchDisplayMode () {
        this.actions.switchDisplayMode ();
    }

    switchDisplayLayer () {
        this.actions.switchDisplayLayer ();
    }

    switchMeta () {
        this.actions.switchShowMeta ();
        this.info.enabled = !this.info.enabled;
    }

    downloadResults (mode: 'all' | 'checked') {
        this.actions.download (mode);
    }

}
