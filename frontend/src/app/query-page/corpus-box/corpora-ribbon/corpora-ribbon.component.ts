import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { Corpus } from 'src/app/dataTypes';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';

@Component({
    selector: 'spoco-corpora-ribbon',
    templateUrl: './corpora-ribbon.component.html',
    styleUrls: ['./corpora-ribbon.component.scss'],
    standalone: false
})
export class CorporaRibbonComponent implements OnInit, OnChanges, OnDestroy {
    
    @Input () corpora: Corpus[];
    currentCorpus: Corpus;
    primaryCorpus: Corpus;
    private subscriptions: Subscription[];

    ribbonMaxCorpora: number = 8;
    ribbonSpan: number[] = [];

    constructor (private corporaKeeper: CorporaKeeperService) { }

    ngOnInit(): void {
        // this.corpora = this.corporaKeeper.getCorpora ();
        this.primaryCorpus = this.corporaKeeper.getPrimary ();
        this.currentCorpus = this.corporaKeeper.getCurrent ();
        this.ribbonSpan = [1, Math.min (this.ribbonMaxCorpora + 1, this.corpora.length)];

        // const sub_corpus: Subscription = this.corporaKeeper.corporaChange.subscribe (corpora => this.corpora = corpora);
        const sub_primary: Subscription = this.corporaKeeper.primaryChange.subscribe (primary => this.primaryCorpus = primary);
        const sub_current: Subscription = this.corporaKeeper.currentChange.subscribe (current => this.currentCorpus = current);
        this.subscriptions = [sub_primary, sub_current];
    }

    ngOnChanges (changes: SimpleChanges) {
        this.ribbonSpan = [1, Math.min (this.ribbonMaxCorpora + 1, this.corpora.length)];
    }

    ngOnDestroy(): void {
        for (let sub of this.subscriptions)
            sub.unsubscribe ();
    }

    scrollRibbon (mode: string) {
        if (mode === 'up' && this.ribbonSpan[0] > 1) {
            this.ribbonSpan[0] -= 1;
            this.ribbonSpan[1] -= 1;
        }
        else if (mode === 'down' && this.ribbonSpan[1] < this.corpora.length) {
            this.ribbonSpan[0] += 1;
            this.ribbonSpan[1] += 1;
        }
    }

    secondary () {
        return this.corpora.slice (this.ribbonSpan[0], this.ribbonSpan[1]);
    }

    setCurrent (corpus: Corpus) {
        this.corporaKeeper.setCurrent (corpus);
    }

    showArrow (mode: string) {
    if (
        (mode === 'up' && this.ribbonSpan[0] !== 1) ||
        (mode == 'down' && this.ribbonSpan[1] !== this.corpora.length)
    )
        return true;
    else
        return false;
    }

}
