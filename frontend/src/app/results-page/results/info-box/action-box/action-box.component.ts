import { Component, OnInit } from '@angular/core';
import { faShuffle, faLeftRight, faExchangeAlt, faInfoCircle, faEye, faDownload, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faComment } from '@fortawesome/free-regular-svg-icons';
import { faSquareCheck } from '@fortawesome/free-regular-svg-icons';
import { ActionService } from 'src/app/action.service';
import { ConfigService } from 'src/app/config.service';
import { AnnotationDisplay } from 'src/app/dataTypes';

interface IconControl {
    icon: IconDefinition, 
    enabled: boolean, 
    show: boolean, 
    help: string
};
interface FlavouredIconControl extends IconControl {
    flavours: {[key: string]: IconControl}
};

@Component({
    selector: 'spoco-action-box',
    templateUrl: './action-box.component.html',
    styleUrls: ['./action-box.component.scss'],
    standalone: false
})
export class ActionBoxComponent implements OnInit {

    mode: IconControl;
    meta: IconControl;
    layers: IconControl;
    download: FlavouredIconControl;
    annotation: FlavouredIconControl;
    annotationSetting: AnnotationDisplay;
    tooltipDelay = 500;

    constructor(private actions: ActionService, private config: ConfigService) { }

    ngOnInit(): void {
        const layers = this.config.fetch ('layers') ?? [];
        const meta_enabled = this.config.fetch ('showMeta', true) ?? false;
        this.annotationSetting = this.config.fetch ('annotationDisplay', true) ?? 'tooltip';
        this.mode = {icon: faExchangeAlt, enabled: true, show: true, help: 'Toggle display mode'};
        this.meta = {icon: faInfoCircle, enabled: meta_enabled, show: true, help: 'Show/hide metadata'};
        this.layers = {icon: faEye, enabled: true, show: layers.length > 1, help: 'Switch display layers'};
        this.download = {
            icon: faDownload, 
            enabled: true, show: 
            true, help: 'Download results',
            flavours: {
                selected: {icon: faSquareCheck, enabled: true, show: true, help: 'Selected results'},
                all: {icon: faDownload, enabled: true, show: true, help: 'All results'}
            }
        };
        this.annotation = {
            icon: faComment, 
            enabled: true, 
            show: true, 
            help: 'Additional annotation display',
            flavours: {
                tooltip: {icon: faComment, enabled: this.annotationSetting !== 'tooltip', show: true, help: 'tooltip'},
                mixed: {icon: faShuffle, enabled: this.annotationSetting !== 'mixed', show: true, help: 'context: tooltip, match: inline'},
                inline: {icon: faLeftRight, enabled: this.annotationSetting !== 'inline', show: true, help: 'inline'},
            }
        }
    }

    toggleDisplayMode () {
        this.actions.toggleDisplayMode ();
    }

    switchDisplayLayer () {
        this.actions.switchDisplayLayer ();
    }

    switchMeta () {
        this.actions.switchShowMeta ();
        this.meta.enabled = !this.meta.enabled;
        this.config.store ('showMeta', this.meta.enabled, true);
    }

    downloadResults (mode: 'all' | 'checked') {
        this.actions.download (mode);
    }

    setAnnotationDisplay (setting: AnnotationDisplay) {
        this.actions.setAnnotationDisplay (setting);
        for (let key in this.annotation.flavours) {
            this.annotation.flavours[key].enabled = !(key === setting);
        }
        this.config.store ('annotationDisplay', setting, true);
    }

}
