import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { QueryKeeperService } from '../../../query-keeper.service';

@Component({
    selector: 'spoco-cqp-query',
    templateUrl: './cqp-query.component.html',
    styleUrls: ['./cqp-query.component.scss']
})
export class CqpQueryComponent implements OnInit, OnDestroy {

    valueChanged: Subscription;
    autoChange: boolean = false;

    constructor(private queryKeeper: QueryKeeperService) { }

    ngOnInit(): void {
        this.valueChanged = this.queryKeeper.valueChanged.subscribe (_changeType => {
            const cqpQuery: string = this.queryKeeper.getQuery ();
            this.autoChange = true;
            this.cqpQueryForm.setValue ({cqp: cqpQuery});
        });
        this.cqpQueryForm.valueChanges.subscribe (data => {
            if (!this.autoChange)
                this.queryKeeper.setQuery (data.cqp);
            this.autoChange = false;
        });  
    }

    ngOnDestroy(): void {
        this.valueChanged.unsubscribe ();
    }

    cqpQueryForm: FormGroup = new FormGroup ({
        'cqp': new FormControl (null)
    });

}
