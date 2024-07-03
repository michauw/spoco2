import { Component, Input, OnInit } from '@angular/core';
import { ConfigService } from 'src/app/config.service';
import { QueryKeeperService } from 'src/app/query-keeper.service';

@Component({
    selector: 'spoco-info-box',
    templateUrl: './info-box.component.html',
    styleUrls: ['./info-box.component.scss']
})
export class InfoBoxComponent implements OnInit {

    constructor(private config: ConfigService) { }

    ngOnInit(): void {
        if (this.module === 'collocations') {
            const cs = this.config.fetch ('collocations_settings');
            this.window_size = cs.window_size;
            this.frequency_filter = cs.frequency_filter;
        }
        
    }

    @Input() results_fetched: Boolean;
    @Input() results_number: Number;
    @Input() module: 'concordance' | 'collocations' | 'frequency';
    @Input() query: string;
    @Input() error: string;

    window_size: number;
    frequency_filter: number;

    error_multiline () {
        return this.error.split ('\n');
    }

}
