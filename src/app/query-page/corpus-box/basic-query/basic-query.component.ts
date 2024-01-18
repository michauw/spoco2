import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Corpus } from 'src/app/dataTypes';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { QueryKeeperService } from '../../../query-keeper.service';

@Component({
    selector: 'spoco-basic-query',
    templateUrl: './basic-query.component.html',
    styleUrls: ['./basic-query.component.scss']
})
export class BasicQueryComponent implements OnInit, OnDestroy {

    constructor(private queryKeeper: QueryKeeperService, private corporaKeeper: CorporaKeeperService) { }

    queryRowNumber: number = 0;

    @Input() currentCorpus: Corpus;
    @Input() primaryCorpus: Corpus;
    @Input() corpora: Corpus[];

    corpusSelect: UntypedFormGroup;
    private subscriptions: Subscription[];

    ngOnInit(): void {
        this.queryRowNumber = 1;
        this.corpusSelect = new UntypedFormGroup({
            'currentCorpus': new UntypedFormControl(this.currentCorpus),
            'primaryCorpus': new UntypedFormControl(this.primaryCorpus)
        });

        this.corpusSelect.valueChanges.subscribe(data => {
            this.corporaKeeper.setCurrent(data.currentCorpus);
            this.corporaKeeper.setPrimary(data.primaryCorpus);
        });

        this.corpora = this.corporaKeeper.getCorpora ();
        this.currentCorpus = this.corporaKeeper.getCurrent ();
        this.primaryCorpus = this.corporaKeeper.getPrimary ();

        let sub_current = this.corporaKeeper.currentChange.subscribe(corpus => this.currentCorpus = corpus);
        let sub_primary = this.corporaKeeper.primaryChange.subscribe(corpus => this.primaryCorpus = corpus);

        this.subscriptions = [sub_current, sub_primary];
    }

    ngOnDestroy(): void {
        for (let sub of this.subscriptions)
            sub.unsubscribe();
    }

    qrRange() {
        return Array(this.queryRowNumber).fill(0).map((x, i) => i);
    }

    moreRows() {
        this.queryRowNumber += 1;
    }

    lessRows() {
        this.queryRowNumber -= 1;
        this.queryKeeper.pop(this.currentCorpus.id);
    }

    moveCorpus (direction: string) {
        this.corporaKeeper.moveCorpus (direction);
    }

    isArrowEnabled(direction: string) {

        let pos: number = this.corporaKeeper.findCorpusPosition(this.currentCorpus);

        if (direction === 'up' && pos > 1)
            return true;
        if (direction === 'down' && pos < this.corpora.length - 1)
            return true;

        return false;
    }

    setAsPrimary() {
        this.corporaKeeper.setPrimary (this.currentCorpus);
    }

    switchIcon(event: any, toRemove: string, toAdd: string) {
        let target = event.target;
        if (toRemove)
            target.classList.remove(toRemove);
        if (toAdd)
            target.classList.add(toAdd);
    }

}
