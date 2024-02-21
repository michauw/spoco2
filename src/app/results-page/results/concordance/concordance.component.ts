import { Component, OnInit } from '@angular/core';
import { ResultsComponent, postData } from '../results.component';
import { ConcordanceEntry, PAttribute, SAttribute, Word, metaObj } from 'src/app/dataTypes';
import { HttpClient, HttpDownloadProgressEvent, HttpEvent, HttpEventType } from '@angular/common/http';
import { BASE_URL } from 'src/environments/environment';
import { Observable } from 'rxjs';

interface postDataConcordance extends postData {
    context: string;
    to_show: string[];
    print_structures: string[];
    size_limit?: number;
    chunk_size?: number;
    end_chunk_size?: number
    mode?: 'full' | 'partial';
    separator?: string;
}

type results_data = {'query': string, 'number_of_results': number};

@Component({
    selector: 'spoco-concordance',
    templateUrl: './concordance.component.html',
    styleUrl: './concordance.component.scss'
})
export class ConcordanceComponent extends ResultsComponent<ConcordanceEntry> implements OnInit {

    constructor (private http: HttpClient) {
        super (...ResultsComponent.inject_dependencies ());
    }

    override ngOnInit(): void {
        super.ngOnInit ();
        let post_data = this.get_post_data ('full');
        this.original_query = post_data.query.primary.query;
        let url = `${BASE_URL}/concordance`;
        this.make_request (url, post_data, 'full');
    }
    
    override pageChangedChild (pageNumber: number): void {
        if (this.data_missing ())
            this.load_missing_data (pageNumber)
    }

    private data_missing () {
        return Boolean (this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize).filter (el => el === undefined).length);
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

    private load_missing_data (pageNumber: number) {
        const location = pageNumber * this.sliceSize;
        const chunk_start = Math.floor (location / this.CHUNK_SIZE) * this.CHUNK_SIZE;
        // this.results_first_empty = chunk_start;
        const post_data = this.get_post_data ('partial', chunk_start);
        const url = `${BASE_URL}/concordance`;
        this.make_request (url, post_data, 'partial');
        this.handle_big_results (chunk_start);
    }

    protected override make_request (url: string, post_data: postDataConcordance, mode: 'full' | 'partial'
    ) {
        const request: Observable<any> = this.http.post (url, post_data, {observe: 'events', responseType: 'text', reportProgress: true});
        this.handle_streaming_response (request, post_data, mode);
    }

    protected override get_post_data (mode: 'full' | 'partial', size?: number | undefined) {
        
        this.pattrs_to_show = this.pattrs.filter ((el: PAttribute) => el.inTooltip).map ((el: PAttribute) => el.name);
        if (!this.pattrs_to_show.length || this.pattrs_to_show[0] !== 'word')
            this.pattrs_to_show = ['word'].concat (this.pattrs_to_show);
        const context = this.config.fetch ('cwb')['context'];
        const sattrs = this.config.fetch ('structuralAttributes');
        const sattrs_cwb = sattrs.filter ((el: SAttribute) => el.inResults || el.context || el.audio).map ((el: SAttribute) => el.name);
        this.sattrs_to_show = sattrs.filter ((el: SAttribute) => el.inResults);
        
        let base_post_data = super.get_post_data (mode, size);
        let post_data: postDataConcordance = {
            ...base_post_data,
            context: context, 
            to_show: this.pattrs_to_show, 
            print_structures: sattrs_cwb, 
            size_limit: this.SIZE_LIMIT,
            chunk_size: this.CHUNK_SIZE,
            end_chunk_size: this.END_CHUNK_SIZE,
            mode: mode,
            separator: this.STREAM_SEPARATOR_TEXT
        }

        return post_data;
    }

    private handle_streaming_response (request: Observable<any>, post_data: postDataConcordance, mode: 'full' | 'partial') {

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
                                this.results[this.results_position++] = batch.length === 1 ? this.parse_primary_line (batch[0]) : this.parse_parallel_batch (batch);
                                batch = [];
                                // else if (this.module !== 'concordance') {
                                //     const parsed = this.parse_stats_line (batch[0]);
                                //     if (this.module === 'collocations')
                                //         this.collocations.push ({token: parsed[0], freq: parseInt (parsed[1]), am: parseFloat (parsed[2])});
                                //     else if (this.module === 'frequency')
                                //         this.frequency.push ({token: parsed[0], freq: parseInt (parsed[1])});
                                //     batch = [];
                                // }
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
                        this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
                        this.results_fetched = true;
                        if (mode === 'full') {
                            this.results_fetched_event.emit ({query: post_data.query.primary.query, number_of_results: this.results_number});
                        }
                        // else if (mode === 'partial')
                        //     this.update_page ();
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

    private parse_primary_line (line: string): ConcordanceEntry {
        const pattern = /^<LI><EM>(\d+):<\/EM>(?:<EM>(.*?)<\/EM>)? *(.*)<B>(.*)<\/B>(.*)/;
        let line_out: ConcordanceEntry = {left_context: [], match: [], right_context: [], id: '', meta: {}, aligned: [], selected: false };
        const match = pattern.exec (line);
        if (!match)
            return line_out;
        let sattrs = {};
        if (match[2] !== undefined)
            sattrs = this.get_sattrs (match[2]);
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

    private get_sattrs (text: string) {
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

    protected override get_aoa (entries: ConcordanceEntry[]) {
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
            parsed_entry.push (this.words_to_string (entry.match, 'lemma'));
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

    
}
