import { Component, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { ActionService } from '../../action.service';
import { ConfigService } from '../../config.service';
import { CorporaKeeperService } from '../../corpora-keeper.service';
import { corpusType, ConcordanceEntry, PAttribute, SAttribute, Word, metaObj, Corpus, Query, GenericEntry, TableEntry } from '../../dataTypes';
import { QueryKeeperService } from '../../query-keeper.service';
import { Observable, Subscription } from 'rxjs';
import { utils, writeFile, writeFileXLSX } from 'xlsx';
import { EventEmitter } from '@angular/core';
import { modules } from '../results-page.component';

export interface postData {
    query: Query;
    paths: Object;
    corpora: Corpus[];
    start?: number;
    // context: string;
    // to_show: string[];
    // print_structures: string[];
    // size_limit?: number;
    // chunk_size?: number;
    // end_chunk_size?: number;
    // mode?: 'full' | 'partial';
    // separator?: string;
    // window_size?: number;
    // frequency_filter?: number;
    // pos?: string[];
    // grouping_attribute?: {name: string, position: number};
}

type genericResultsType = (ConcordanceEntry | TableEntry)[];
type results_data = {'query': string, 'number_of_results': number}

export type ResultsDependencies = [QueryKeeperService, ConfigService, CorporaKeeperService, ActionService];

@Component({
    selector: 'spoco-results',
    templateUrl: './results.component.html',
    styleUrls: ['./results.component.scss']
})
export abstract class ResultsComponent<T extends GenericEntry> implements OnInit, OnDestroy {

    @Output() results_fetched_event: EventEmitter<results_data> = new EventEmitter<results_data> ()
    @Output() results_added_event: EventEmitter<modules> = new EventEmitter<modules> ();
    @Output() results_updated_event: EventEmitter<number> = new EventEmitter<number> ();
    @Output() error: EventEmitter<string> = new EventEmitter<string> ();

    corpora: Corpus[];
    results_fetched: Boolean;
    results: T[];
    currentSlice: T[];
    currentSliceBegin: number = 0;
    sliceSize: number = 20;
    pattrs: PAttribute[];
    pattrs_to_show: string[];
    sattrs_to_show: SAttribute[];
    corpusType: corpusType;
    downloadResultsSub: Subscription; 
    original_query: string;
    results_number: number;
    results_position: number = 0;
    results_history: number[] = [];

    SIZE_LIMIT: number = 10000;
    CHUNK_SIZE: number = 10000;
    END_CHUNK_SIZE: number = 1000;
    STREAM_SEPARATOR_TEXT = '==STREAM SEPARATOR==';
    MAX_RESULTS_SIZE: number = 40000;

    constructor(
        protected queryKeeper: QueryKeeperService, 
        protected config: ConfigService,
        protected corporaKeeper: CorporaKeeperService, 
        protected actions: ActionService,
    ) { }

    static inject_dependencies (): ResultsDependencies {

        const qks = inject (QueryKeeperService);
        const cs = inject (ConfigService);
        const cks = inject (CorporaKeeperService);
        const as = inject (ActionService);

        return [qks, cs, cks, as];
    }

    ngOnInit(): void {

        this.corpusType = this.config.fetch ('corpusType');
        if (this.corpusType == 'mono')
            this.actions.setDisplayMode ('kwic');
        else
            this.actions.setDisplayMode ('plain');
        if (!this.corpusType.length)
            this.corpusType = 'parallel';
        this.sliceSize = this.config.fetch ('preferences')['results_per_page'];
        this.corpora = this.corporaKeeper.getCorpora ();
        this.currentSlice = [];
        this.results_fetched = false;
        this.pattrs = this.config.fetch ('positionalAttributes');
        // let post_data = this.get_post_data ('full');
        // this.original_query = post_data.query.primary.query;
        this.results = [];
        // let url: string = '';
        // if (this.module === 'concordance')
        //     url = `${base_url}/results`;
        // else if (this.module === 'collocations') {
        //     url = `${base_url}/collocations`;
        // }
        // else if (this.module === 'frequency')
        //     url = `${base_url}/frequency`;
        // this.make_request (url, post_data, 'full');
        this.downloadResultsSub = this.actions.downloadResults.subscribe (mode => this.downloadResults (mode));
    }

    ngOnDestroy(): void {
        this.downloadResultsSub.unsubscribe ();
    }

    downloadResults (mode: 'all' | 'checked', format: 'tsv' | 'xlsx' = 'xlsx') {
        let toSave = [];
        let file_data: any;
        if (mode === 'all') {
            toSave = this.results;
        }
        else {
            toSave = this.results.filter (row => row.selected);
        }
        let aoa_data = this.get_aoa (toSave);   // array of arrays
        if (format === 'tsv') {
            file_data = this.aoa_to_string (aoa_data);
            const blob = new Blob ([file_data], {type: 'text/csv'});
            let a = document.createElement ('a');
            document.body.appendChild (a);
            a.setAttribute ('style', 'display: none'); 
            const url= window.URL.createObjectURL (blob);
            a.href = url;
            a.download = 'results.tsv';
            a.click ();
            document.body.removeChild (a);
        }
        else {
            this.aoa_to_xlsx (aoa_data);
        }
    }

    get_pattr_position (pattr_name: string) {
        for (let pattr of this.pattrs)
            if (pattr.name === pattr_name)
                return pattr.position;
        return -1;
    }



    get_results_number () {
        // if (this.module === 'concordance')
        //     return this.results_number;
        // if (this.module === 'collocations')
        //     return this.collocations.length;
        // if (this.module === 'frequency')
        //     return this.frequency.length;
        // return 0;
    }

    pageChanged (pageNumber: number) {
        this.currentSliceBegin = (pageNumber - 1) * this.sliceSize;
        this.pageChangedChild (pageNumber);
        this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'auto' 
          });
        // if (this.module === 'concordance' && this.data_missing ())
        //         this.load_missing_data (pageNumber);
        // else
        //     this.update_page ();
    }

    protected pageChangedChild (pageNumber: number) {
    }

    protected get_post_data (mode: 'full' | 'partial', start?: number) {
        let query = {} as Query;
        query = this.queryKeeper.getCorpusQueries ();
        if (!query.primary.query)
            query.primary.query = '[]';
        const cwb_settings = this.config.fetch ('cwb');

            // this.pattrs_to_show = this.pattrs.filter ((el: PAttribute) => el.inTooltip).map ((el: PAttribute) => el.name);
            // if (!this.pattrs_to_show.length || this.pattrs_to_show[0] !== 'word')
            //     this.pattrs_to_show = ['word'].concat (this.pattrs_to_show);
            // const sattrs = this.config.fetch ('structuralAttributes');
            // let sattrs_cwb = sattrs.filter ((el: SAttribute) => el.inResults || el.context || el.audio).map ((el: SAttribute) => el.name);
            // this.sattrs_to_show = sattrs.filter ((el: SAttribute) => el.inResults);
        let post_data: postData = {
            query: query, 
            paths: cwb_settings.paths, 
            corpora: this.corpora,
            // context: cwb_settings.context, 
            // to_show: this.pattrs_to_show, 
            // print_structures: sattrs_cwb, 
            // size_limit: this.SIZE_LIMIT,
            // chunk_size: this.CHUNK_SIZE,
            // end_chunk_size: this.END_CHUNK_SIZE,
            // mode: mode,
            // separator: this.STREAM_SEPARATOR_TEXT
        };
        if (start !== undefined)
            post_data['start'] = start;

        // if (this.module === 'collocations') {
        //     const collocations_settings = this.config.fetch ('collocations_settings');
        //     post_data['window_size'] = collocations_settings['window_size'];
        //     post_data['frequency_filter'] = collocations_settings['frequency_filter'];
        //     post_data['grouping_attribute'] = {name: collocations_settings['pattr'], position: this.get_pattr_position (collocations_settings['pattr'])};
        //     post_data['pos'] = collocations_settings['pos'];
        // }
        // else if (this.module === 'frequency') {
        //     const frequency_settings = this.config.fetch ('frequency_settings');
        //     post_data['grouping_attribute'] = {name: frequency_settings['pattr'], position: this.get_pattr_position (frequency_settings['pattr'])};
        //     post_data['frequency_filter'] = frequency_settings['frequency_filter'];
        // }
        
        return post_data;
    }

    

    // private handle_big_results (last_chunk_start: number) {
    //     this.results_history.push (last_chunk_start);
    //     if (this.results_history.length > 1 && (this.results_history.length + 1) * this.CHUNK_SIZE + this.END_CHUNK_SIZE > this.MAX_RESULTS_SIZE) {
    //         const oldest = this.results_history[0];
    //         const undefs = Array (this.CHUNK_SIZE).fill (undefined);
    //         this.results.splice (oldest, this.CHUNK_SIZE, ...undefs);
    //         this.results_history.shift ();
    //     }
    // }
    
    protected handle_static_response (request: Observable<any>, post_data: postData) {
        // request.subscribe ({
        //     next:
        //         (responseData) => {
        //             for (let datum of responseData) {
        //                 if (this.module === 'collocations')
        //                     this.collocations.push ({token: datum[0], am: datum[1], freq: datum[2]});
        //                 else if (this.module === 'frequency')
        //                     this.frequency.push ({token: datum[0], freq: datum[1]});
        //             }
        //             if (this.module === 'collocations')
        //                 this.currentSliceCol = this.collocations.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        //             else if (this.module === 'frequency')
        //                 this.currentSliceFreq = this.frequency.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        //             this.results_fetched_event.emit ({query: post_data.query.primary.query, number_of_results: this.get_results_number ()});
        //         },
        //     error:
        //         (response) => {
        //             let error = '';
        //             try {
        //                 error = JSON.parse (response.error).detail;
        //                 error = error.replace (/[\n\t]/g, ' ');
        //             }
        //             catch (e) {
        //                 error = ':('
        //             }
        //             this.error.emit (error);
        //         }
        // });
    }
        

    

    // private load_missing_data (pageNumber: number) {
    //     const location = pageNumber * this.sliceSize;
    //     const chunk_start = Math.floor (location / this.CHUNK_SIZE) * this.CHUNK_SIZE;
    //     // this.results_first_empty = chunk_start;
    //     const post_data = this.get_post_data ('partial', chunk_start);
    //     const url = `${base_url}/results`;
    //     this.make_request (url, post_data, 'partial');
    //     this.handle_big_results (chunk_start);
    // }

    protected make_request (url: string, post_data: postData, mode: 'full' | 'partial') {
        
        // const request: Observable<any> = this.http.post (url, post_data);
        // this.handle_static_response (request, post_data);
        // }
    }

    protected words_to_string (words: Word[]) {
        return words.map (w => w.word).join (' ');
    }

    protected get_aoa (entries: T[]) {
        return [] as any[];
    }

    private aoa_to_string (aoa_data: any, delimiter = '\t') {
        let rows = [];
        for (let row of aoa_data)
            rows.push (row.join (delimiter));
        
        return rows.join ('\n');
    }

    private aoa_to_xlsx (aoa_data: any) {
        const data = utils.aoa_to_sheet (aoa_data);
        const workbook = utils.book_new ();
        utils.book_append_sheet (workbook, data);
        writeFileXLSX (workbook, 'results.xlsx');
    }

    

    // private parse_results (lines: any) {
    //     let output: ConcordanceEntry[] = [];
    //     const corpusType = (this.corpora.length === 1) ? 'mono' : 'parallel';
    //     let parallel_batch = [];
    //     // this.results_number = parseInt (lines[0]);
    //     for (let i = 0; i < lines.length; ++i) {
    //         let line = lines[i];
    //         if (!line)
    //             continue;
    //         if (corpusType === 'mono'){
    //             const parsed = this.parse_primary_line (line);
    //             if (parsed.id)
    //                 output.push (parsed);
    //         }
    //         else {
    //             parallel_batch.push (line);
    //             if (parallel_batch.length === this.corpora.length) {
    //                 const parsed = this.parse_parallel_line (parallel_batch);
    //                 if (parsed.id)
    //                     output.push (parsed);
    //                 parallel_batch = [];
    //             }
    //         }
    //     }

    //     return output;
    // }

    // private get_position_from_line (line: string): {position: number, start: number}  {
    //     const pattern = /^(\d+):\s*/;
    //     const match = pattern.exec (line);
    //     return {position: parseInt (match![1]), start: match![0].length}
    // } 

    private parse_stats_line (line: string, separator: string = '\t') {
        return line.trim ().split (separator);
    }

    // private parse_frequency (data: any) {
    //     let output: frequency[] = [];
    //     for (let line of data) {
    //         const entry = line.split ('\t');
    //         output.push ({'token': entry[0], 'freq': entry[1]});
    //     }
    //     return output;
    // }

    private update_page () {
        // if (this.module === 'concordance')
        //     this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        // else if (this.module === 'collocations')
        //     this.currentSliceCol = this.collocations.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        // else if (this.module === 'frequency')
        //     this.currentSliceFreq = this.frequency.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
    }

}
