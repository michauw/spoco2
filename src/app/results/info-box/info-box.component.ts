import { Component, Input, OnInit } from '@angular/core';
import { QueryKeeperService } from 'src/app/query-keeper.service';

@Component({
    selector: 'spoco-info-box',
    templateUrl: './info-box.component.html',
    styleUrls: ['./info-box.component.scss']
})
export class InfoBoxComponent implements OnInit {

    constructor(private queryKeeper: QueryKeeperService) { }

    ngOnInit(): void {
        try {
            this.query = this.queryKeeper.getFinalQuery ()
        }
        catch (error) {
            this.query = 'mock query ([word="pies"%c])';
        }
    }

    @Input() results_fetched: Boolean;
    @Input() results_number: Number;

    query: string;

}
