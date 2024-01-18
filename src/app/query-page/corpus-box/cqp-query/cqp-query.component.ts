import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Corpus } from 'src/app/dataTypes';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { QueryKeeperService } from '../../../query-keeper.service';

@Component({
    selector: 'spoco-cqp-query',
    templateUrl: './cqp-query.component.html',
    styleUrls: ['./cqp-query.component.scss']
})
export class CqpQueryComponent implements OnInit, OnDestroy {

    valueChanged: Subscription;
    autoChange: boolean = false;

    constructor(private queryKeeper: QueryKeeperService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit(): void {
        this.valueChanged = this.queryKeeper.valueChanged.subscribe (_changeType => {
            const cqpQuery: string = this.queryKeeper.getQuery (this.corpus.id);
            this.autoChange = true;
            this.cqpQueryForm.setValue ({cqp: cqpQuery});
        });
        this.cqpQueryForm.valueChanges.subscribe (data => {
            if (!this.autoChange)
                this.queryKeeper.setQuery (data.cqp, this.corpus.id);
            this.autoChange = false;
        });  
        this.corpus = this.corporaKeeper.getCurrent ();
        this.corpusChanged = this.corporaKeeper.currentChange.subscribe (corpus => {
            this.corpus = corpus;
            this.cqpQueryForm.patchValue ({cqp: this.queryKeeper.getQuery (this.corpus.id)});
        });
        
    }

    ngOnDestroy(): void {
        this.valueChanged.unsubscribe ();
        this.corpusChanged.unsubscribe ();
    }

    cqpQueryForm: UntypedFormGroup = new UntypedFormGroup ({
        'cqp': new UntypedFormControl (null)
    });
    corpus: Corpus;
    corpusChanged: Subscription;

}
