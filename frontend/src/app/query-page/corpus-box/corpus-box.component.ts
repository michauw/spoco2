import { Component, EventEmitter, OnInit, Injectable, OnDestroy, Output, SimpleChanges } from '@angular/core';
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
    chosenCorpora: Corpus[];
    chosenCorporaOptions: any[];
    currentCorpus: Corpus;
    displayMode: queryPageDisplayMode;
    corpusType: corpusType;
    spacing_basic: {'md': number, 'lg': number, 'xl': number, 'offset': string};
    spacing_advanced: {'col': string, 'offset': string};
    
    subPrimaryChanged: Subscription;
    subCorporaChanged: Subscription;
    subCurrentCorpora: Subscription;

    constructor (private config: ConfigService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit (): void {
        this.primaryCorpus = this.corporaKeeper.getPrimary ();
        this.corpora = this.corporaKeeper.getCorpora ();
        const storedPrimary = localStorage.getItem ('primaryCorpus');
        if (storedPrimary && storedPrimary !== this.primaryCorpus.id) {
            for (let corpus of this.corpora) {
                if (corpus.id === storedPrimary) {
                    this.corporaKeeper.setPrimary (corpus);
                    this.primaryCorpus = corpus;
                    this.corpora = this.corporaKeeper.getCorpora ();
                    this.corporaKeeper.setCurrent (corpus);
                    break;
                }         
            }
        }
        this.secondaryCorpora = this.corporaKeeper.getSecondary ();
        this.chosenCorpora = this.config.fetch ('chosenCorpora', true) ?? this.corpora;
        this.corporaKeeper.setChosenCorpora (this.chosenCorpora);
        this.chosenCorporaOptions = this.getChosenCorporaOptions ();
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
        this.subCorporaChanged = this.corporaKeeper.corporaChange.subscribe ((change) => {
            this.primaryCorpus = this.corporaKeeper.getPrimary ();
            this.secondaryCorpora = this.corporaKeeper.getSecondary ();
            this.currentCorpus = this.corporaKeeper.getCurrent ();
            this.chosenCorporaOptions = this.getChosenCorporaOptions ();
            if (change.changes.length > 0 && this.displayMode === 'boxes') {
                const all_boxes = Array.from (document.getElementsByTagName ('spoco-basic-query'));
                let to_animate = all_boxes.filter ((_, index) => change.changes.includes (index));
                if (to_animate.length === 1) {
                    to_animate.splice (0, 0, all_boxes[0]);
                }

                for (let box of to_animate) {
                    box.classList.add ('fade-out');
                }

                setTimeout (() => {
                    this.corpora = change.corpora;
                    this.chosenCorpora = this.corporaKeeper.getCorpora (true);

                    for (let box of to_animate) {
                        box.classList.remove ('fade-out');
                        box.classList.add ('fade-in');
                    }

                    setTimeout (() => {
                        for (let box of to_animate)
                            box.classList.remove ('fade-in');
                    }, 300);

                }, 300);
            }
            else {
                this.corpora = change.corpora;
                this.chosenCorpora = this.corporaKeeper.getCorpora (true);
            }

        });
        this.subCurrentCorpora = this.corporaKeeper.currentChange.subscribe ((corpus) => this.currentCorpus = corpus);
    }

    ngOnDestroy(): void {
        this.subCorporaChanged.unsubscribe ();
        this.subCurrentCorpora.unsubscribe ();
    }

    chosenCorporaChanged (chosen: string[]) {
        this.chosenCorpora = this.corpora.filter (c => chosen.includes (c.name));
        this.corporaKeeper.setChosenCorpora (this.chosenCorpora);
        this.config.store ('chosenCorpora', this.chosenCorpora, true);
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

    private getChosenCorporaOptions () {
        return this.corpora.map (c => (
            {
                name: c.name, 
                value: this.chosenCorpora.map (cc => cc.id).includes (c.id), 
                disabled: c === this.primaryCorpus,
                suffix: c === this.primaryCorpus ? ' (primary)' : '' 
            }));
    }
}
