import { Component, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { ActionService } from '../../action.service';
import { ConfigService } from '../../config.service';
import { CorporaKeeperService } from '../../corpora-keeper.service';
import { corpusType, ConcordanceEntry, PAttribute, SAttribute, Word, metaObj, Corpus, Query, GenericEntry, TableEntry, resultsDisplayMode } from '../../dataTypes';
import { QueryKeeperService } from '../../query-keeper.service';
import { Observable, Subscription } from 'rxjs';
import { utils, writeFile, writeFileXLSX } from 'xlsx';
import { EventEmitter } from '@angular/core';
import { modules } from '../results-page.component';

export interface postData {
    query: Query;
    corpora: Corpus[];
    start?: number;
}

type genericResultsType = (ConcordanceEntry | TableEntry)[];
type results_data = {'query': string, 'number_of_results': number}

export type ResultsDependencies = [QueryKeeperService, ConfigService, CorporaKeeperService, ActionService];

@Component({
    selector: 'spoco-results',
    templateUrl: './results.component.html',
    styleUrls: ['./results.component.scss'],
    standalone: false
})
export abstract class ResultsComponent<T extends GenericEntry> implements OnInit, OnDestroy {

    @Output() results_fetched_event: EventEmitter<results_data> = new EventEmitter<results_data> ()
    @Output() results_added_event: EventEmitter<modules> = new EventEmitter<modules> ();
    @Output() results_updated_event: EventEmitter<number> = new EventEmitter<number> ();
    @Output() error: EventEmitter<string> = new EventEmitter<string> ();

    corpora: Corpus[];
    results_fetched: Boolean;
    results: T[] = [];  // has to be initialized here - in other case the loop over results in child components tries to render undefined
    currentSlice: T[] = [];
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
    sort_ascending: boolean;

    SIZE_LIMIT: number = 1000;
    CHUNK_SIZE: number = 1000;
    END_CHUNK_SIZE: number = 500;
    STREAM_SEPARATOR_TEXT = '==STREAM SEPARATOR==';
    MAX_RESULTS_SIZE: number = 40000;
    TOKEN_LIMIT: number = 500000;

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
        // const storedDisplay = this.config.fetch ('resDisplayMode', true);
        // if (storedDisplay)
        //     this.actions.setDisplayMode (storedDisplay as resultsDisplayMode);
        // else {
        //     if (this.corpusType == 'mono')
        //         this.actions.setDisplayMode ('kwic');
        //     else
        //         this.actions.setDisplayMode ('plain');
        // }
        if (!this.corpusType.length)
            this.corpusType = 'parallel';
        this.sliceSize = this.config.fetch ('preferences', true)['results_per_page'];
        this.corpora = this.corporaKeeper.getCorpora ();
        this.currentSlice = [];
        this.results_fetched = false;
        this.pattrs = this.config.fetch ('positionalAttributes');
        this.results = [];
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
    }

    protected pageChanged (pageNumber: number) {
            this.currentSliceBegin = (pageNumber - 1) * this.sliceSize;
            this.pageChangedChild (pageNumber);
            this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'auto' 
          });
    }

    protected sort_results (by: number | 'left_context' | 'match' | 'right_context', in_context?: boolean) {
    }

    protected pageChangedChild (pageNumber: number) {
    }

    protected get_post_data (mode: 'full' | 'partial', start?: number) {
        let query = {} as Query;
        query = this.queryKeeper.getCorpusQueries ();
        if (!query.primary.query)
            query.primary.query = '[]';
        let post_data: postData = {
            query: query, 
            corpora: this.corpora,
        };
        if (start !== undefined)
            post_data['start'] = start;
        return post_data;
    }
    protected handle_static_response (request: Observable<any>, post_data: postData) {
    }

    protected make_request (url: string, post_data: postData, mode: 'full' | 'partial') {
    }

    protected words_to_string (words: Word[], pattr: string = 'word') {
        return words.map (w => w[pattr]).join (' ');
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

    private parse_stats_line (line: string, separator: string = '\t') {
        return line.trim ().split (separator);
    }

    private update_page () {
    }

}
