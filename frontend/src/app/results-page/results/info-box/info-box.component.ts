import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ConfigService } from 'src/app/config.service';

@Component({
    selector: 'spoco-info-box',
    templateUrl: './info-box.component.html',
    styleUrls: ['./info-box.component.scss'],
    standalone: false
})
export class InfoBoxComponent implements OnInit, OnChanges {

    constructor(private config: ConfigService, private cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        if (this.module === 'collocations') {
            const cs = this.config.fetch ('collocation_settings', true);
            this.window_size = cs.window_size;
            this.frequency_filter = cs.frequency_filter;
        }
        
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.cdr.detectChanges ();
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
