import { Component, Input } from '@angular/core';
import { ResultsComponent, postData } from '../results.component';
import { CorpusInfo, PAttribute, TableEntry } from 'src/app/dataTypes';
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
    @Input() scale: number;

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
            const pattrs_to_show = this.pattrs.filter ((el: PAttribute) => el.inResults).map ((el: PAttribute) => el.name);
            additional_post_data['ams'] = settings['ams'];
            additional_post_data['window_size'] = settings['window_size'];
            additional_post_data['frequency_filter'] = settings['frequency_filter'];
            additional_post_data['grouping_attribute'] = this.get_grouping_attribute (settings['pattr'], base_post_data.query.primary.query);
            additional_post_data['context'] = this.config.fetch ('cwb')['context'];
            additional_post_data['to_show'] = pattrs_to_show;
            additional_post_data['case'] = this.get_case_sensitivity (settings['case'], base_post_data.query.primary.query);
        }
        else if (this.module === 'frequency') {
            const settings = this.config.fetch ('frequency_settings');
            additional_post_data['grouping_attribute'] = this.get_grouping_attribute (settings['pattr'], base_post_data.query.primary.query);
            additional_post_data['frequency_filter'] = settings['frequency_filter'];
            additional_post_data['case'] = this.get_case_sensitivity ('match', base_post_data.query.primary.query);
        }
        let post_data: postDataTable = {
            ...base_post_data,
            ...additional_post_data
        }
        console.log ('post data:', post_data);
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
                        if (this.scale !== undefined)
                            datum.push (datum[datum.length - 1] / this.scale);
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

    protected override sort_results (by: number): void {
        if (this.sort_ascending === undefined)
            this.sort_ascending = true;
        else
            this.sort_ascending = !this.sort_ascending;
        this.results.sort ((a, b) => {
            if (a.values[by] < b.values[by]) return this.sort_ascending ? -1 : 1;
            if (a.values[by] > b.values[by]) return this.sort_ascending ? 1 : -1;
            return 0;
        });
        this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
    }

    get_concordance (token: string) {
        if (this.module === 'frequency') {
            const settings = this.config.fetch ('frequency_settings');
            let pattr = this.get_grouping_attribute (settings.pattr, this.original_query);
            let cs = this.original_query.indexOf ('%c') === -1 ? '' : '%c';
            let fr_query = `[${pattr}="${token}"${cs}]`;
            const orig_query_parts = this.original_query.split ('::');
            if (orig_query_parts.length > 1)
                fr_query += '::' + orig_query_parts[1];
            let query = this.queryKeeper.getCorpusQueries ();
            query.primary.query = fr_query;
            this.queryKeeper.setQuery (fr_query, query.primary.corpus);
            this.results_added_event.emit ('concordance');
        }
        else if (this.module === 'collocations') {
            const settings = this.config.fetch ('collocations_settings');
            const gap = settings.window_size ? `[]{0,${settings.window_size}}` : '';
            const orig_query_parts = this.original_query.split ('::');
            let meta = '';
            let orig_query = this.original_query;
            if (orig_query_parts.length == 2) {
                orig_query = orig_query_parts[0];
                meta = '::' + orig_query_parts[1];
            }
            let pattr = this.get_grouping_attribute (settings.pattr, orig_query);
            let cs = orig_query.indexOf ('%c') === -1 ? '' : '%c';
            const col_query = `[${pattr}="${token}"${cs}]${gap}${orig_query}|${orig_query}${gap}[${pattr}="${token}"${cs}]${meta}`;
            let query = this.queryKeeper.getCorpusQueries ();
            query.primary.query = col_query;
            this.queryKeeper.setQuery (col_query, query.primary.corpus);
            this.results_added_event.emit ('concordance');
        }
    }

    private get_grouping_attribute (value: string, query: string): string {
        if (value !== 'match')
            return value;
        const pattern = /([\w-]+)="/g;
        const attributes: string[] = [];
        let match: RegExpExecArray | null;
    
        while ((match = pattern.exec(query)) !== null) {
            attributes.push(match[1]);
        }
    
        let grouping = 'lemma';
    
        if (attributes.length === 1) {
            grouping = attributes[0];
        } else if (attributes.length > 1) {
            const precedence = ['lemma', 'word'];
            for (const attr of precedence) {
                if (attributes.includes(attr)) {
                    grouping = attr;
                    break;
                }
            }
            if (!precedence.some(attr => attributes.includes(attr))) {
                grouping = attributes[0];
            }
        }
    
        return grouping;
    }
    

    private get_case_sensitivity (value: string, query: string) {
        if (value === 'match') {
            if (query.indexOf ('%c') !== -1) 
                return 'ci';
            else
                return 'cs';
        }
        return value;
    }
}
