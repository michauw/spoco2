import { Component, OnInit, Injectable } from '@angular/core';
import { ActivatedRoute, Data } from '@angular/router';
import { ConfigService } from 'src/app/config.service';
import { Corpus, corpusType, queryPageDisplayMode } from 'src/app/dataTypes';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';

@Component({
  selector: 'spoco-corpus-box',
  templateUrl: './corpus-box.component.html',
  styleUrls: ['./corpus-box.component.scss']
})

@Injectable()
export class CorpusBoxComponent implements OnInit {

    constructor (private route: ActivatedRoute, private configService: ConfigService, private corporaKeeper: CorporaKeeperService) { }

    ngOnInit (): void {
        this.route.data.subscribe (     // loading settings from settings/config.json and storing them in configService (shouldn't be in the query-page component?)
            (data: Data) => { 
                this.configService.store ('positionalAttributes', data['config']['positionalAttributes']);
                this.configService.store ('modifiers', data['config']['modifiers']);
                this.configService.store ('structuralAttributes', data['config']['structuralAttributes']);
                this.configService.store ('filters', data['config']['filters']);
                this.configService.store ('cwb', data['config']['cwb']);
                this.corpora = data['config']['corpora'];
                this.corpora = this.corporaKeeper.setCorpora (this.corpora);    // setCorpora changes corpora order (primary corpous goes first)
                if (data['config'].hasOwnProperty ('audio')) {
                    this.configService.store ('audio', data['config']['audio']);
                    this.corpusType = 'spoken';
                }
                else {
                    if (this.corpora.length == 1)
                        this.corpusType = 'mono';
                    else
                        this.corpusType = 'parallel';
                }
                this.configService.store ('corpusType', this.corpusType);
            }
        );
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

    corpora: Corpus[];
    displayMode: queryPageDisplayMode;
    corpusType: corpusType;
}
