import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { QueryKeeperService } from '../query-keeper.service';

@Component({
    selector: 'spoco-cqp-query',
    templateUrl: './cqp-query.component.html',
    styleUrls: ['./cqp-query.component.scss']
})
export class CqpQueryComponent implements OnInit {

    constructor(private queryKeeper: QueryKeeperService) { }

    ngOnInit(): void {
        this.queryKeeper.valueChanged.subscribe (data => {
            const cqpQuery: string = this.queryKeeper.getQuery ();
            this.cqpQueryForm.setValue ({cqp: cqpQuery});
        });
    }

    cqpQueryForm: FormGroup = new FormGroup ({
        'cqp': new FormControl (null)
    });

}
