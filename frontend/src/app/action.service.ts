import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AnnotationDisplay, resultsDisplayMode } from './dataTypes';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class ActionService {

    displayModeChanged = new Subject<void> ();
    displayLayerChanged = new Subject<void> ();
    showMetaChanged = new Subject<void> ();
    downloadResults = new Subject< 'all' | 'checked' > ();
    annotationDisplayChanged = new Subject<AnnotationDisplay> ();

    constructor(private config: ConfigService) { }

    toggleDisplayMode () {
        this.displayModeChanged.next ();
    }

    switchDisplayLayer () {
        this.displayLayerChanged.next ();
    }

    switchShowMeta () {
        this.showMetaChanged.next ();
    }

    download (mode: 'all' | 'checked') {
        this.downloadResults.next (mode);
    }

    setAnnotationDisplay (setting: AnnotationDisplay) {
        this.annotationDisplayChanged.next (setting);
    }
    
}
