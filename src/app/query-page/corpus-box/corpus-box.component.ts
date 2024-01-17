import { Component, OnInit, Injectable } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';
import { ConfigService } from 'src/app/config.service';
import { Corpus, SAttribute, corpusType, queryPageDisplayMode } from 'src/app/dataTypes';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';

@Component({
  selector: 'spoco-corpus-box',
  templateUrl: './corpus-box.component.html',
  styleUrls: ['./corpus-box.component.scss']
})

@Injectable()
export class CorpusBoxComponent implements OnInit {

    corpora: Corpus[];
    displayMode: queryPageDisplayMode;
    corpusType: corpusType;

    constructor (private configService: ConfigService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit (): void {
        this.corpora = this.configService.fetch ('corpora'); 
        this.corpora = this.corporaKeeper.getCorpora ();    
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
    }
}
