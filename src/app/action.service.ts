import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { resultsDisplayMode } from './dataTypes';

@Injectable({
    providedIn: 'root'
})
export class ActionService {

    constructor() { }

    displayMode: resultsDisplayMode;
    showMeta: boolean = false;
    displayModeChanged = new Subject<resultsDisplayMode> ();
    showMetaChanged = new Subject<boolean> ();
    downloadResults = new Subject<string> ();

    setDisplayMode (dm: resultsDisplayMode) {
        this.displayMode = dm;
        this.displayModeChanged.next (this.displayMode);
    }

    switchDisplayMode () {
        if (this.displayMode == 'plain')
            this.displayMode = 'kwic';
        else
            this.displayMode = 'plain';
        this.displayModeChanged.next (this.displayMode);
    }

    switchShowMeta () {
        this.showMeta = !this.showMeta;
        this.showMetaChanged.next (this.showMeta);
    }

    download (mode: string) {
        this.downloadResults.next (mode);
    }
    
}
