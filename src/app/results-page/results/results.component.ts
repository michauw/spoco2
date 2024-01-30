import { HttpClient, HttpDownloadProgressEvent, HttpEvent, HttpEventType } from '@angular/common/http';
import { Component, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ActionService } from '../../action.service';
import { ConfigService } from '../../config.service';
import { CorporaKeeperService } from '../../corpora-keeper.service';
import { corpusType, ConcordanceEntry, PAttribute, SAttribute, Word, metaObj, Corpus, Query } from '../../dataTypes';
import { QueryKeeperService } from '../../query-keeper.service';
import { Observable, Subscription } from 'rxjs';
import { utils, writeFile, writeFileXLSX } from 'xlsx';
import { ActivatedRoute, Params } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { modules } from '../results-page.component';
import { base_url } from 'src/environments/environment';

interface postData {
    query: Query;
    paths: Object;
    context: string;
    to_show: string[];
    print_structures: string[];
    corpora: Corpus[];
    start?: number;
    size_limit?: number;
    chunk_size?: number;
    end_chunk_size?: number;
    mode?: 'full' | 'partial';
    separator?: string;
    window_size?: number;
    frequency_filter?: number;
    pos?: string[];
    grouping_attribute?: {name: string, position: number};
}

type collocation = {'token': string, 'am': number, 'freq': number};
type frequency = {'token': string, 'freq': number};
type results_data = {'query': string, 'number_of_results': number}

@Component({
    selector: 'spoco-results',
    templateUrl: './results.component.html',
    styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit, OnDestroy {

    @Input() module: modules;
    @Output() results_fetched_event: EventEmitter<results_data> = new EventEmitter<results_data> ()
    @Output() results_added_event: EventEmitter<modules> = new EventEmitter<modules> ();
    @Output() results_updated_event: EventEmitter<number> = new EventEmitter<number> ();
    @Output() error: EventEmitter<string> = new EventEmitter<string> ();

    collocations: collocation[];
    frequency: frequency[];
    corpora: Corpus[];
    results_fetched: Boolean;
    results: ConcordanceEntry[];
    currentSlice: ConcordanceEntry[];
    currentSliceCol: collocation[];
    currentSliceFreq: frequency[];
    currentSliceBegin: number = 0;
    sliceSize: number = 20;
    pattrs: PAttribute[];
    pattrs_to_show: string[];
    sattrs_to_show: SAttribute[];
    corpusType: corpusType;
    downloadResultsSub: Subscription; 
    original_query: string;
    loading_response: boolean;
    results_number: number;
    results_position: number = 0;
    results_history: number[] = [];

    SIZE_LIMIT: number = 10000;
    CHUNK_SIZE: number = 10000;
    END_CHUNK_SIZE: number = 1000;
    STREAM_SEPARATOR_TEXT = '==STREAM SEPARATOR==';
    MAX_RESULTS_SIZE: number = 40000;

    constructor(
        private queryKeeper: QueryKeeperService, 
        private config: ConfigService,
        private corporaKeeper: CorporaKeeperService, 
        private http: HttpClient,
        private actions: ActionService,
        private route: ActivatedRoute
    ) { }

    ngOnInit(): void {

        this.loading_response = true;
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
        this.currentSliceCol = [];
        this.results_fetched = false;
        this.pattrs = this.config.fetch ('positionalAttributes')
        let post_data = this.get_post_data ('full');
        this.original_query = post_data.query.primary.query;
        this.results = [];
        this.collocations = [];
        this.frequency = [];
        let url: string = '';
        if (this.module === 'concordance')
            url = `${base_url}/results`;
        else if (this.module === 'collocations') {
            url = `${base_url}/collocations`;
        }
        else if (this.module === 'frequency')
            url = `${base_url}/frequency`;
        this.make_request (url, post_data, 'full');
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
        let aoa_data = this.get_aoa (toSave);
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

    get_concordance_from_collocation (collocation: collocation) {
        const cs = this.config.fetch ('collocations_settings');
        const gap = cs.window_size ? `[]{0,${cs.window_size}}` : '';
        const orig_query_parts = this.original_query.split ('::');
        let meta = '';
        let orig_query = this.original_query;
        if (orig_query_parts.length == 2) {
            orig_query = orig_query_parts[0];
            meta = '::' + orig_query_parts[1];
        }
        const col_query = `[${cs.pattr}="${collocation.token}"]${gap}${orig_query}|${orig_query}${gap}[${cs.pattr}="${collocation.token}"]${meta}`;
        let query = this.queryKeeper.getCorpusQueries ();
        query.primary.query = col_query;
        this.queryKeeper.setQuery (col_query, query.primary.corpus);
        this.results_added_event.emit ('concordance');
    }

    get_concordance_from_freq (freq: frequency) {
        const fs = this.config.fetch ('frequency_settings');
        let fr_query = `[${fs.pattr}="${freq.token}"]`;
        const orig_query_parts = this.original_query.split ('::');
        if (orig_query_parts.length > 1)
            fr_query += '::' + orig_query_parts[1];
        let query = this.queryKeeper.getCorpusQueries ();
        query.primary.query = fr_query;
        this.queryKeeper.setQuery (fr_query, query.primary.corpus);
        this.results_added_event.emit ('concordance');
    }

    get_pattr_position (pattr_name: string) {
        for (let pattr of this.pattrs)
            if (pattr.name === pattr_name)
                return pattr.position;
        return -1;
    }

    get_results_number () {
        if (this.module === 'concordance')
            return this.results_number;
        if (this.module === 'collocations')
            return this.collocations.length;
        if (this.module === 'frequency')
            return this.frequency.length;
        return 0;
    }

    pageChanged (pageNumber: number) {
        this.currentSliceBegin = (pageNumber - 1) * this.sliceSize;
        if (this.module === 'concordance' && this.data_missing ())
                this.load_missing_data (pageNumber);
        else
            this.update_page ();
    }

    private data_missing () {
        return Boolean (this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize).filter (el => el === undefined).length);
    }

    private get_post_data (mode: 'full' | 'partial', start?: number) {
        let query = {} as Query;
        let mock = false;
        try {
            query = this.queryKeeper.getCorpusQueries ();
            if (!query.primary.query)
                query.primary.query = '[]';
        }
        catch (error) {
            mock = true;
        }
        this.pattrs_to_show = this.pattrs.filter ((el: PAttribute) => el.inTooltip).map ((el: PAttribute) => el.name);
        if (!this.pattrs_to_show.length || this.pattrs_to_show[0] !== 'word')
            this.pattrs_to_show = ['word'].concat (this.pattrs_to_show);
        const cwb_settings = this.config.fetch ('cwb');
        const sattrs = this.config.fetch ('structuralAttributes');
        let sattrs_cwb = sattrs.filter ((el: SAttribute) => el.inResults || el.context || el.audio).map ((el: SAttribute) => el.name);
        this.sattrs_to_show = sattrs.filter ((el: SAttribute) => el.inResults);
        let post_data: postData = {
            query: query, 
            paths: cwb_settings.paths, 
            context: cwb_settings.context, 
            to_show: this.pattrs_to_show, 
            print_structures: sattrs_cwb, 
            corpora: this.corpora,
            size_limit: this.SIZE_LIMIT,
            chunk_size: this.CHUNK_SIZE,
            end_chunk_size: this.END_CHUNK_SIZE,
            mode: mode,
            separator: this.STREAM_SEPARATOR_TEXT
        };
        if (start !== undefined)
            post_data['start'] = start;

        if (mock) {
            this.pattrs_to_show = ['word', 'lemma', 'tag'];
            const post_data_mono = {
                query: {primary: {corpus: 'boy', query: '[word="pies"%c]'}, secondary: []},
                paths: {'cqp-path': 'D:\\Praca\\narzedzia\\cwb\\cwb3.4\\bin\\cqpcl', 'registry-path': 'D:\\Praca\\zasoby\\korpusy\\boy\\Registry'},
                context: '1s',
                to_show: this.pattrs_to_show,
                print_structures: ['s_id', 'meta_autor', 'meta_tytul', 'meta_data_wydania', 'meta_data_tlumaczenia'],
                corpora: this.corpora
            };
            const post_data_parallel = {
                query: {primary: {corpus: 'letrint_en', query: '[word="judge"%c]'}, secondary: []},
                paths: {'cqp-path': 'D:\\Praca\\narzedzia\\cwb\\cwb3.4\\bin\\cqpcl', 'registry-path': 'D:\\Praca\\Genewa\\Corpus\\Registry'},
                context: '1s',
                to_show: this.pattrs_to_show,
                print_structures: ['Align_id', 'meta_organisation', 'meta_publication_date', 'meta_legal_function', 'meta_textual_genre', 'meta_subgenre', 'meta_title_en', 'meta_title_es', 'meta_title_fr'],
                corpora: this.corpora
            };
            if (this.corpusType == 'mono')
                post_data = post_data_mono;
            else
                post_data = post_data_parallel;
            
        }
        if (this.module === 'collocations') {
            const collocations_settings = this.config.fetch ('collocations_settings');
            post_data['window_size'] = collocations_settings['window_size'];
            post_data['frequency_filter'] = collocations_settings['frequency_filter'];
            post_data['grouping_attribute'] = {name: collocations_settings['pattr'], position: this.get_pattr_position (collocations_settings['pattr'])};
            post_data['pos'] = collocations_settings['pos'];
        }
        else if (this.module === 'frequency') {
            const frequency_settings = this.config.fetch ('frequency_settings');
            post_data['grouping_attribute'] = {name: frequency_settings['pattr'], position: this.get_pattr_position (frequency_settings['pattr'])};
            post_data['frequency_filter'] = frequency_settings['frequency_filter'];
        }
        
        return post_data;
    }

    private get_sattrs (text: string, mode: string) {
        const pattern_html = /&lt;(.*?) (.*?)&gt;/g
        let sattrs: metaObj = {};
        let match;
        while ((match = pattern_html.exec (text)) !== null) {
            const name = match[1];
            const value = match[2];
            let description = '';
            let show = false;
            const pos = this.sattrs_to_show.map (el => el.name).indexOf (name);
            if (pos !== -1) {
                description = this.sattrs_to_show[pos].description;
                show = true;
            }
            sattrs[name] = {value: value, description: description, show: show};
        }
        return sattrs;
    }

    private handle_big_results (last_chunk_start: number) {
        this.results_history.push (last_chunk_start);
        if (this.results_history.length > 1 && (this.results_history.length + 1) * this.CHUNK_SIZE + this.END_CHUNK_SIZE > this.MAX_RESULTS_SIZE) {
            const oldest = this.results_history[0];
            const undefs = Array (this.CHUNK_SIZE).fill (undefined);
            this.results.splice (oldest, this.CHUNK_SIZE, ...undefs);
            this.results_history.shift ();
        }
    }
    
    private handle_static_response (request: Observable<any>, post_data: postData) {
        request.subscribe ({
            next:
                (responseData) => {
                    for (let datum of responseData) {
                        if (this.module === 'collocations')
                            this.collocations.push ({token: datum[0], am: datum[1], freq: datum[2]});
                        else if (this.module === 'frequency')
                            this.frequency.push ({token: datum[0], freq: datum[1]});
                    }
                    if (this.module === 'collocations')
                        this.currentSliceCol = this.collocations.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
                    else if (this.module === 'frequency')
                        this.currentSliceFreq = this.frequency.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
                    this.results_fetched_event.emit ({query: post_data.query.primary.query, number_of_results: this.get_results_number ()});
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
        

    private handle_streaming_response (request: Observable<any>, post_data: postData, mode: 'full' | 'partial') {

        let partialText_pos = 0;
        const stages: ('size' | 'regular' | 'ending')[] = ['size', 'regular', 'ending'];
        let stage_index = mode === 'full' ? 0 : 1;
        this.results_position = post_data.start !== undefined ? post_data.start : 0;
        request.subscribe ({
            next: 
                (event: HttpEvent<string>) => {
                    console.log ('event:', event.type, this.results_position);
                    let partial_batch: string[] = [];
                    if (event.type === HttpEventType.DownloadProgress) {
                        const ev = (
                            event as HttpDownloadProgressEvent
                        );
                        let line_end = ev.partialText!.indexOf ('\n', partialText_pos);
                        let batch: string[] = partial_batch;
                        partial_batch = [];
                        let count = 0;
                        while (line_end !== -1) {
                            const line = ev.partialText!.slice (partialText_pos, line_end);
                            if (line === this.STREAM_SEPARATOR_TEXT) {
                                if (stage_index && batch.length)
                                    console.log (
                                        `WARNING: (make_request) next stage (${stages[stage_index]} --> ${stages[stage_index + 1]}) while batch not empty (${batch.length} lines left unhandled)`
                                    );
                                stage_index += 1;
                                if (stages[stage_index] === 'ending')
                                    this.results_position = this.results_number - post_data.end_chunk_size!;
                            }
                            else if (stages[stage_index] === 'size') {
                                this.results_number = parseInt (line);
                                this.results = Array (this.results_number).fill (undefined);
                                this.results_updated_event.emit (this.results_number);
                            }
                            else {
                                count += 1;
                                batch.push (line);
                                if (this.module === 'concordance' && batch.length === this.corpora.length) {
                                    this.results[this.results_position++] = batch.length === 1 ? this.parse_primary_line (batch[0]) : this.parse_parallel_batch (batch);
                                    batch = [];
                                }
                                else if (this.module !== 'concordance') {
                                    const parsed = this.parse_stats_line (batch[0]);
                                    if (this.module === 'collocations')
                                        this.collocations.push ({token: parsed[0], freq: parseInt (parsed[1]), am: parseFloat (parsed[2])});
                                    else if (this.module === 'frequency')
                                        this.frequency.push ({token: parsed[0], freq: parseInt (parsed[1])});
                                    batch = [];
                                }
                            }
                            partialText_pos = line_end += 1;
                            line_end = ev.partialText!.indexOf ('\n', partialText_pos);
                        }
                        if (batch.length)
                            partial_batch = batch;
                    }
                    else if (event.type === HttpEventType.Response) {
                        if (event.body === '0')
                            this.results_number = 0;
                        else {
                            // const batch = event.body!.slice (partialText_pos);
                            // const parts = batch.split (this.STREAM_SEPARATOR_TEXT);
                            // stage = mode === 'full' ? 'size' : 'regular';
                            // for (let i = 0; i < parts.length; ++i) {
                            //     const part = parts[i];
                            //     this.handle_results_batch (part, corpora.length, stage);
                            //     if (i < parts.length - 1) {
                            //         if (stage === 'size')
                            //             stage = 'regular';
                            //         else if (stage === 'regular')
                            //             stage = 'ending';
                            //     }
                            // }
                        }
                        this.results_fetched = true;
                        if (this.module === 'concordance')
                            this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
                        else if (this.module === 'collocations')
                            this.currentSliceCol = this.collocations.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
                        else if (this.module === 'frequency')
                            this.currentSliceFreq = this.frequency.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
                        // this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
                        if (mode === 'full') {
                            this.results_fetched_event.emit ({query: post_data.query.primary.query, number_of_results: this.get_results_number ()});
                        }
                        else if (mode === 'partial')
                            this.update_page ();
                    }
            },
            error: (response) => {
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

    private load_missing_data (pageNumber: number) {
        const location = pageNumber * this.sliceSize;
        const chunk_start = Math.floor (location / this.CHUNK_SIZE) * this.CHUNK_SIZE;
        // this.results_first_empty = chunk_start;
        const post_data = this.get_post_data ('partial', chunk_start);
        const url = `${base_url}/results`;
        this.make_request (url, post_data, 'partial');
        this.handle_big_results (chunk_start);
    }

    private make_request (url: string, post_data: postData, mode: 'full' | 'partial') {
        
        if (this.module === 'concordance') {
            const request: Observable<any> = this.http.post (url, post_data, {observe: 'events', responseType: 'text', reportProgress: true});
            this.handle_streaming_response (request, post_data, mode);
        }
        else {
            const request: Observable<any> = this.http.post (url, post_data);
            this.handle_static_response (request, post_data);
        }
    }

    private to_words (text: string) {
        let words: Word[] = [];
        for (let token of text.split (' ')) {
            let elements = token.split ('\t');
            let w: Word = {word: ''};
            for (let ipattr = 0; ipattr < this.pattrs_to_show.length; ++ipattr)
                w[this.pattrs_to_show[ipattr]] = elements[ipattr];
            words.push (w)
        }

        return words;
    }

    private words_to_string (words: Word[]) {
        return words.map (w => w.word).join (' ');
    }

    private get_aoa (entries: ConcordanceEntry[]) {
        let data = [];
        let header = ['Left Context', 'Match', 'Right Context'];
        for (let aligned of entries[0].aligned)
            header.push (aligned.corpus_name);
        for (let meta_key in entries[0].meta)
            header.push (meta_key);
        data.push (header);
        for (let entry of entries) {
            let parsed_entry = [];
            parsed_entry.push (this.words_to_string (entry.left_context));
            parsed_entry.push (this.words_to_string (entry.match));
            parsed_entry.push (this.words_to_string (entry.right_context));
            for (let aligned of entry.aligned) {
                parsed_entry.push (this.words_to_string (aligned.content));
            }
            for (let meta in entry.meta) {
                parsed_entry.push (entry.meta[meta]);
            }
            data.push (parsed_entry);
        }
        return data;
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

    private parse_primary_line (line: string): ConcordanceEntry {
        const pattern = /^<LI><EM>(\d+):<\/EM>(?:<EM>(.*?)<\/EM>)? *(.*)<B>(.*)<\/B>(.*)/;
        let line_out: ConcordanceEntry = {left_context: [], match: [], right_context: [], id: '', meta: {}, aligned: [], selected: false };
        const match = pattern.exec (line);
        if (!match)
            return line_out;
        let sattrs = {};
        if (match[2] !== undefined)
            sattrs = this.get_sattrs (match[2], 'html')
        let parts = match.slice (3);    // left_context ; match ; right context
        for (let ipart = 0; ipart < parts.length; ++ipart) {
            let words: Word[] = this.to_words (parts[ipart]);
            switch (ipart) {
                case 0: 
                    line_out['left_context'] = words;
                    break;
                case 1: 
                    line_out['match'] = words;
                    break;
                case 2: 
                    line_out['right_context'] = words;
                    break;
            }
        }
        line_out['id'] = match[1];
        line_out['meta'] = sattrs;
        line_out['aligned'] = [];

        return line_out;
    }

    private parse_parallel_batch (batch: string[]) {
        const pattern_aligned = /<P><B><EM>--&gt;(.*?)<\/EM><\/B>&nbsp;&nbsp;(.*)/
        let parsed: ConcordanceEntry = {left_context: [], match: [], right_context: [], id: '', meta: {}, aligned: [], selected: false };
        for (let i = 0; i < this.corpora.length; ++i) {
            const line = batch[i];
            if (i === 0) {
                parsed = this.parse_primary_line (line);
            }
            else {
                const match = pattern_aligned.exec (line);
                if (!match)
                    continue;
                parsed.aligned.push ({corpus_name: match[1], content: this.to_words (match[2])});
            }
        }

        return parsed;
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
        if (this.module === 'concordance')
            this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        else if (this.module === 'collocations')
            this.currentSliceCol = this.collocations.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        else if (this.module === 'frequency')
            this.currentSliceFreq = this.frequency.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'auto' 
          });
    }

}
