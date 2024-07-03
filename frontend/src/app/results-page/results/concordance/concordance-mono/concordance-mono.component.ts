import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActionService } from 'src/app/action.service';
import { ConcordanceEntry, Corpus, Word, metaObj } from 'src/app/dataTypes';
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
        this.displayModeChangedSub = this.actions.displayModeChanged.subscribe (mode => this.mode = mode);
        this.showMetaChangedSub = this.actions.showMetaChanged.subscribe (show => this.showMeta = show);
    }

    ngOnDestroy(): void {
        this.displayModeChangedSub.unsubscribe ();
        this.showMetaChangedSub.unsubscribe ();
    }

    @Input() results: ConcordanceEntry[];
    @Input() pattrs_to_show: string[];
    mode: string;
    showMeta: boolean;
    displayModeChangedSub: Subscription;
    showMetaChangedSub: Subscription;
    maxContextSize: number;
    corpora: Corpus[];

    cutContext (context: Word[], side: string) {
        if (side === 'left')
            return context.slice (-this.maxContextSize - 1);
        else (side == 'right')
            return context.slice (0, this.maxContextSize + 1);
    }

    toList (meta: metaObj) {
        let lst = [];
        for (let name in meta)
            if (meta[name].show)
                lst.push ({name: meta[name].description !== '' ? meta[name].description : name, value: meta[name].value});

        return lst;
    }

    get_tooltip (word: Word) {
        let tooltip = [];
        for (let pattr of this.pattrs_to_show)
            if (pattr !== 'word')
                tooltip.push (word[pattr]);

        return tooltip.join (' : ');
    }
}
