import { Component, EventEmitter, OnInit, Injectable, OnDestroy, Output } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';
import { ConfigService } from 'src/app/config.service';
import { Corpus, SAttribute, corpusType, queryPageDisplayMode } from 'src/app/dataTypes';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'spoco-corpus-box',
    templateUrl: './corpus-box.component.html',
    styleUrls: ['./corpus-box.component.scss'],
    standalone: false
})

@Injectable()
export class CorpusBoxComponent implements OnInit, OnDestroy {

    @Output () displayModeSet = new EventEmitter<queryPageDisplayMode> ();

    primaryCorpus: Corpus;
    secondaryCorpora: Corpus[];
    corpora: Corpus[];
    currentCorpus: Corpus;
    displayMode: queryPageDisplayMode;
    corpusType: corpusType;
    spacing_basic: {'md': number, 'lg': number, 'xl': number, 'offset': string};
    spacing_advanced: {'col': string, 'offset': string};
    
    sub_primaryChanged: Subscription;
    sub_corporaChanged: Subscription;
    sub_currentCorpora: Subscription;

    constructor (private config: ConfigService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit (): void {
        this.primaryCorpus = this.corporaKeeper.getPrimary ()
        this.secondaryCorpora = this.corporaKeeper.getSecondary ();
        this.corpora = this.corporaKeeper.getCorpora ();
        this.currentCorpus = this.corporaKeeper.getCurrent ();

        // this.currentCorpus = this.corporaKeeper.getCurrent ();
        this.displayMode = this.config.fetch ('qpDisplayMode', true);
        if (!this.displayMode) {
            switch (this.corpora.length) {    // default query page display mode depends on the number of corpora
                case 1: 
                    this.displayMode = 'mono';  // one corpus
                    break;
                case 2:
                    this.displayMode = 'boxes';   // two corpora: two corpus boxes
                    break;
                default:
                    this.displayMode = 'ribbon';    // three or more corpora: corpora ribbon
            }
            this.config.store ('qpDisplayMode', this.displayMode, true);
        }
        this.displayModeSet.emit (this.displayMode);
        this.setSpacing ();
        this.sub_corporaChanged = this.corporaKeeper.corporaChange.subscribe ((corpora) => {
            this.primaryCorpus = this.corporaKeeper.getPrimary ();
            this.secondaryCorpora = this.corporaKeeper.getSecondary ();
            this.currentCorpus = this.corporaKeeper.getCurrent ();
            this.corpora = corpora;
        });
        this.sub_currentCorpora = this.corporaKeeper.currentChange.subscribe ((corpus) => this.currentCorpus = corpus);
    }

    ngOnDestroy(): void {
        this.sub_corporaChanged.unsubscribe ();
        this.sub_currentCorpora.unsubscribe ();
    }

    setSpacing () {
        if (this.corpora.length === 1 || this.displayMode === 'ribbon') {
            this.spacing_basic  = {'md': 10, 'lg': 10, 'xl': 10, 'offset': 'offset-md-1'};
            this.spacing_advanced = {'col': 'col-md-10', 'offset': 'offset-md-1'}
        }
        else {
            this.spacing_basic = {
                'md': 6, 
                'lg': Math.max (6, Math.floor (12 / this.corpora.length)), 
                'xl': Math.max (4, Math.floor (12 / this.corpora.length)),
                'offset': ''
            };
            this.spacing_advanced = {'col': 'col-12', 'offset': ''};
        }
    }

    toggleView () {
        if (this.displayMode === 'ribbon')
            this.displayMode = 'boxes';
        else if (this.displayMode === 'boxes')
            this.displayMode = 'ribbon';
        this.setSpacing ();
        this.config.store ('qpDisplayMode', this.displayMode, true);
        this.displayModeSet.emit (this.displayMode);
    }
}
