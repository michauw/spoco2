import { Component, Input } from '@angular/core';
import { ResultsComponent, postData } from '../results.component';
import { PAttribute, TableEntry } from 'src/app/dataTypes';
import { BASE_URL } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

interface postDataTable extends postData {

    window_size?: number
}

@Component({
    selector: 'spoco-results-table',
    templateUrl: './results-table.component.html',
    styleUrl: './results-table.component.scss'
})
export class ResultsTableComponent extends ResultsComponent<TableEntry> {

    @Input() module: 'frequency' | 'collocations';
    @Input() columns: {name: string, format: string}[];

    constructor (private http: HttpClient) {
        super (...ResultsComponent.inject_dependencies ());
    }

    getColumnValue (element: TableEntry): any[] {
        let values: {value: any, format: string}[] = [];
        for (let i = 0; i < this.columns.length; ++i) {
            values.push ({'value': element.values[i], 'format': this.columns[i].format})
        }
        return values;
    }

    override ngOnInit(): void {
        super.ngOnInit ();
        let post_data = this.get_post_data ('full');
        this.original_query = post_data.query.primary.query;
        let url = `${BASE_URL}/${this.module}`;
        this.make_request (url, post_data, 'full');
    }

    protected override get_post_data (mode: 'full' | 'partial', size?: number | undefined) {
     
        let base_post_data = super.get_post_data (mode, size);
        let additional_post_data: any = {};
        if (this.module === 'collocations') {
            const settings = this.config.fetch ('collocations_settings');
            const pattrs_to_show = this.pattrs.filter ((el: PAttribute) => el.inTooltip).map ((el: PAttribute) => el.name);
            additional_post_data['window_size'] = settings['window_size'];
            additional_post_data['frequency_filter'] = settings['frequency_filter'];
            additional_post_data['grouping_attribute'] = {name: settings['pattr'], position: this.get_pattr_position (settings['pattr'])};
            additional_post_data['context'] = this.config.fetch ('cwb')['context'];
            additional_post_data['to_show'] = pattrs_to_show;
        }
        else if (this.module === 'frequency') {
            const settings = this.config.fetch ('frequency_settings');
            additional_post_data['grouping_attribute'] = {name: settings['pattr'], position: this.get_pattr_position (settings['pattr'])};
            additional_post_data['frequency_filter'] = settings['frequency_filter'];
        }
        let post_data: postDataTable = {
            ...base_post_data,
            ...additional_post_data
        }

        return post_data;
    }

    protected override make_request (url: string, post_data: postData, mode: 'full' | 'partial'): void {
        const request: Observable<any> = this.http.post (url, post_data);
        this.handle_static_response (request, post_data);
    }

    protected override handle_static_response (request: Observable<any>, post_data: postData) {
        request.subscribe ({
            next:
                (responseData) => {
                    for (let datum of responseData) {
                        this.results.push ({values: datum, meta: {}, selected: false});
                    }
                    this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
                    this.results_fetched_event.emit ({query: post_data.query.primary.query, number_of_results: this.results.length});
                },
            error:
                (response) => {
                    let error = '';
                    try {
                        error = JSON.parse (response.error).detail;
                        error = error.replace (/[\n\t]/g, ' ');
                    }
                    catch (e) {
                        error = ':('
                    }
                    this.error.emit (error);
                }
        });
    }
}
