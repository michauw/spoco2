import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { QueryKeeperService } from '../query-keeper.service';

@Component({
    selector: 'spoco-cqp-query',
    templateUrl: './cqp-query.component.html',
    styleUrls: ['./cqp-query.component.scss']
})
export class CqpQueryComponent implements OnInit, OnDestroy {

    valueChanged: Subscription;

    constructor(private queryKeeper: QueryKeeperService) { }

    ngOnInit(): void {
        this.valueChanged = this.queryKeeper.valueChanged.subscribe (data => {
            const cqpQuery: string = this.queryKeeper.getQuery ();
            this.cqpQueryForm.setValue ({cqp: cqpQuery});
        });
    }

    ngOnDestroy(): void {
        this.valueChanged.unsubscribe ();
    }

    cqpQueryForm: FormGroup = new FormGroup ({
        'cqp': new FormControl (null)
    });

}
