import { Component, OnInit } from '@angular/core';
import { ActionService } from 'src/app/action.service';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { Corpus } from 'src/app/dataTypes';
import { ConcordanceMonoComponent } from '../concordance-mono/concordance-mono.component';

@Component({
    selector: 'spoco-concordance-parallel',
    templateUrl: './concordance-parallel.component.html',
    styleUrls: ['./concordance-parallel.component.scss']
})
export class ConcordanceParallelComponent extends ConcordanceMonoComponent {

    constructor(actions: ActionService, corporaKeeper: CorporaKeeperService) { 
        super (actions, corporaKeeper);
    }
}
