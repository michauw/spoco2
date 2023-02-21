import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActionService } from 'src/app/action.service';
import { ConcordanceEntry, Corpus, Word } from 'src/app/dataTypes';
import {MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions} from '@angular/material/tooltip';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';

export const myCustomTooltipDefaults: MatTooltipDefaultOptions = {
    showDelay: 500,
    hideDelay: 50,
    touchendHideDelay: 300,
  };

@Component({
    selector: 'spoco-concordance-mono',
    templateUrl: './concordance-mono.component.html',
    styleUrls: ['./concordance-mono.component.scss'],
    providers: [{provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: myCustomTooltipDefaults}]
})
export class ConcordanceMonoComponent implements OnInit, OnDestroy {

    constructor(private actions: ActionService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit(): void {
        this.mode = this.actions.displayMode;
        this.showMeta = false;
        this.maxContextSize = 8;
        this.corpora = this.corporaKeeper.getCorpora ();
        this.displayModeChanged = this.actions.displayModeChanged.subscribe (mode => this.mode = mode);
        this.showMetaChanged = this.actions.showMetaChanged.subscribe (show => this.showMeta = show);
    }

    ngOnDestroy(): void {
        this.displayModeChanged.unsubscribe ();
    }

    @Input() results: ConcordanceEntry[];
    mode: string;
    showMeta: boolean;
    displayModeChanged: Subscription;
    showMetaChanged: Subscription;
    maxContextSize: number;
    corpora: Corpus[];

    cutContext (context: Word[], side: string) {
        console.log ('r:', this.results[0]['left_context'][0]);
        if (side === 'left')
            return context.slice (-this.maxContextSize - 1);
        else (side == 'right')
            return context.slice (0, this.maxContextSize + 1);
    }

    toList (meta: {[key: string]: string}) {
        let lst = [];
        for (let name in meta)
            lst.push ({name: name, value: meta[name]});

        return lst;
    }

}
