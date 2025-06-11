import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Corpus, queryPageDisplayMode } from 'src/app/dataTypes';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { QueryKeeperService } from '../../../query-keeper.service';

@Component({
    selector: 'spoco-basic-query',
    templateUrl: './basic-query.component.html',
    styleUrls: ['./basic-query.component.scss'],
    standalone: false
})
export class BasicQueryComponent implements OnInit, OnDestroy {

    constructor(private queryKeeper: QueryKeeperService, private corporaKeeper: CorporaKeeperService) { }

    queryRowNumber: number = 0;

    @Input() corpus: Corpus;
    @Input() primaryCorpus: Corpus;
    @Input() displayMode: queryPageDisplayMode;
    @Output () toggleViewClicked = new EventEmitter<void> ();

    chosenCorpora: Corpus[];
    availableCorporaNumber: number;

    corpusSelect: UntypedFormGroup;
    tooltipShowDelay: number = 400;
    private subscriptions: Subscription[];

    ngOnInit(): void {
        this.queryRowNumber = this.queryKeeper.getNumberOfRows (this.corpus.id);
        this.corpusSelect = new UntypedFormGroup({
            'currentCorpus': new UntypedFormControl (this.corpus),
            'primaryCorpus': new UntypedFormControl (this.primaryCorpus)
        });

        this.corpusSelect.valueChanges.subscribe(data => {
            this.corporaKeeper.setCurrent (data.currentCorpus);
            this.corporaKeeper.setPrimary (data.primaryCorpus);
        });

        this.availableCorporaNumber = this.corporaKeeper.getCorporaNumber ();
        this.chosenCorpora = this.corporaKeeper.getCorpora (true);

        this.primaryCorpus = this.corporaKeeper.getPrimary ();

        let sub_primary = this.corporaKeeper.primaryChange.subscribe (corpus => {
            this.primaryCorpus = corpus;
            this.chosenCorpora = this.corporaKeeper.getCorpora (true);
        });

        let sub_queryChanged = this.queryKeeper.valueChanged.subscribe (type => {
            if (type === 'clear')
                this.queryRowNumber = 1;
        });

        this.subscriptions = [sub_primary, sub_queryChanged]; // [sub_current, sub_primary];
    }

    ngOnDestroy(): void {
        for (let sub of this.subscriptions)
            sub.unsubscribe();
    }

    qrRange() {
        return Array(this.queryRowNumber).fill(0).map ((x, i) => i);
    }

    moreRows() {
        this.queryRowNumber += 1;
    }

    lessRows() {
        this.queryRowNumber -= 1;
        this.queryKeeper.pop (this.corpus.id);
    }

    moveCorpus (direction: string) {
        this.corporaKeeper.moveCorpus (direction, this.corpus);
    }

    isArrowEnabled(direction: string) {

        let pos: number = this.corporaKeeper.findCorpusPosition (this.corpus);

        if (direction === 'up' && pos > 1)
            return true;
        if (direction === 'down' && pos < this.chosenCorpora.length - 1)
            return true;

        return false;
    }

    setAsPrimary() {
        this.corporaKeeper.setPrimary (this.corpus);
        this.corporaKeeper.setCurrent (this.corpus);
    }

    switchIcon (event: any, toRemove: string, toAdd: string) {
        let target = event.target;
        if (toRemove)
            target.classList.remove (toRemove);
        if (toAdd)
            target.classList.add (toAdd);
    }

    toggleView () {
        this.toggleViewClicked.emit ();
    }

}
