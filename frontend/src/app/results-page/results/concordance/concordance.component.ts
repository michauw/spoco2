import { Component, OnDestroy, OnInit } from '@angular/core';
import { ResultsComponent, postData } from '../results.component';
import { ConcordanceEntry, Corpus, PAttribute, SAttribute, Word, metaObj } from 'src/app/dataTypes';
import { HttpClient, HttpDownloadProgressEvent, HttpEvent, HttpEventType } from '@angular/common/http';
import { BASE_URL } from 'src/environments/environment';
import { Observable, Subscription } from 'rxjs';
import { ActionService } from 'src/app/action.service';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { faArrowAltCircleLeft, faArrowAltCircleRight, faPlus, faMinus, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';



interface postDataConcordance extends postData {
    size_limit?: number;
    chunk_size?: number;
    end_chunk_size?: number
    mode?: 'full' | 'partial';
    separator?: string;
}

type results_data = {'query': string, 'number_of_results': number};
type Direction = 'left' | 'right';

@Component({
    selector: 'spoco-concordance',
    templateUrl: './concordance.component.html',
    styleUrl: './concordance.component.scss'
})
export class ConcordanceComponent extends ResultsComponent<ConcordanceEntry> implements OnInit, OnDestroy {

    mode: string;
    showMeta: boolean;
    parallelCorpora: Corpus[];
    max_visible: number;
    maxContextSize: number;
    locked: number[];
    visible_columns: number[];
    displayLayers: string[];
    annotationDisplay: ('tooltip' | 'mixed' | 'inline')[] = ['tooltip', 'mixed', 'inline'];
    currentDisplay: 'tooltip' | 'mixed' | 'inline' = 'tooltip';
    currentLayer: string;
    row_icon_states: {playing: boolean, extended: boolean}[] = [];
    playing: string = '';
    audio: HTMLAudioElement | null = null;
    audio_attribute: string;
    audio_path: string;
    currently_playing: string = '';
    icons = {'plus': faPlus, 'minus': faMinus, 'play': faPlay, 'stop': faStop}
    arrow_left = faArrowAltCircleLeft;
    arrow_right = faArrowAltCircleRight;
    displayModeChangedSub: Subscription;
    displayLayerChangedSub: Subscription;
    showMetaChangedSub: Subscription;
    annotationDisplayChangedSub: Subscription;
    
    constructor (private http: HttpClient) {
        super (...ResultsComponent.inject_dependencies ());
    }

    override ngOnInit(): void {
        super.ngOnInit ();
        let post_data = this.get_post_data ('full');
        let url = `${BASE_URL}/concordance`;
        this.original_query = post_data.query.primary.query;
        this.displayLayers = this.config.fetch ('layers');
        this.currentLayer = this.displayLayers[0];
        if (this.corpusType === 'spoken') {
            const config_audio = this.config.fetch ('audio');
            this.audio_attribute = config_audio.attribute;
            this.audio_path = config_audio['data-dir'];
        }
        this.make_request (url, post_data, 'full');
        this.mode = this.actions.displayMode;
        this.showMeta = false;
        this.max_visible = 3;
        this.maxContextSize = 8;
        this.parallelCorpora = this.corpusType === 'parallel' ? this.corporaKeeper.getCorpora () : [];
        this.locked = [0];
        this.visible_columns = this.get_visible_columns ();
        
        this.displayModeChangedSub = this.actions.displayModeChanged.subscribe (mode => this.mode = mode);
        this.showMetaChangedSub = this.actions.showMetaChanged.subscribe (show => this.showMeta = show);
        this.displayLayerChangedSub = this.actions.displayLayerChanged.subscribe (() => {
            for (let i = 0; i < this.displayLayers.length; ++i) {
                if (this.displayLayers[i] === this.currentLayer) {
                    if (i === this.displayLayers.length - 1)
                        this.currentLayer = this.displayLayers[0];
                    else
                        this.currentLayer = this.displayLayers[i + 1];
                    break;
                }
            }
        });
        this.annotationDisplayChangedSub = this.actions.annotationDisplayChanged.subscribe (() => {
            for (let i = 0; i < this.annotationDisplay.length; ++i) {
                if (this.annotationDisplay[i] === this.currentDisplay) {
                    if (i === this.annotationDisplay.length - 1)
                        this.currentDisplay = this.annotationDisplay[0];
                    else
                        this.currentDisplay = this.annotationDisplay[i + 1];
                    break;
                }
            }
        });
    }

    ngOnChanges(): void {
        this.row_icon_states = this.results.map (() => ({ playing: false, extended: false }));
        if (this.corpusType === 'spoken' && this.audio)
            this.audio.pause ();
    }

    override ngOnDestroy(): void {
        super.ngOnDestroy ();
        this.displayModeChangedSub.unsubscribe ();
        this.displayLayerChangedSub.unsubscribe ();
        this.annotationDisplayChangedSub.unsubscribe ();
        this.showMetaChangedSub.unsubscribe ();
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
        
        this.pattrs_to_show = this.pattrs.filter ((el: PAttribute) => el.inResults).map ((el: PAttribute) => el.name);
        if (!this.pattrs_to_show.length || this.pattrs_to_show[0] !== 'word')
            this.pattrs_to_show = ['word'].concat (this.pattrs_to_show);
        // const context = this.config.fetch ('cwb')['context'];
        const sattrs = this.config.fetch ('structuralAttributes');
        const sattrs_cwb = sattrs.filter ((el: SAttribute) => el.inResults || el.context || el.audio).map ((el: SAttribute) => el.name);
        this.sattrs_to_show = sattrs.filter ((el: SAttribute) => el.inResults);
        
        let base_post_data = super.get_post_data (mode, size);
        let post_data: postDataConcordance = {
            ...base_post_data,
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
        let partial_batch: string[] = [];
        const stages: ('size' | 'regular' | 'ending')[] = ['size', 'regular', 'ending'];
        let stage_index = mode === 'full' ? 0 : 1;
        this.results_position = post_data.start !== undefined ? post_data.start : 0;
        request.subscribe ({
            next: 
                (event: HttpEvent<string>) => {
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
                                this.row_icon_states = this.results.map (() => ({ playing: false, extended: false }));
                                this.results_updated_event.emit (this.results_number);
                            }
                            else {
                                count += 1;
                                if (line.length)
                                    batch.push (line);
                                if (batch.length === this.corpora.length) {
                                    this.results[this.results_position++] = batch.length === 1 ? this.parse_primary_line (batch[0]) : this.parse_parallel_batch (batch);
                                    batch = [];
                                }
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
                        this.currentSlice = this.results.slice (0, this.sliceSize);
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

    private isSticky (word: string, opened: Set<string>): string {    
        const stickyLeft = ['.', ',', ':', ';', '?', '!', ')', ']',  '}', '”', '»', '›', '…'];
        const stickyRight = ['(', '[', '«', '{', '„',  '“', '‹'];
        const ambiguous = ['"', "'"]
        if (stickyLeft.includes (word))
            return 'left';
        if (stickyRight.includes (word))
            return 'right';
        if (ambiguous.includes (word)) {
            if (opened.has (word)) {
                opened.delete (word);
                return 'left';
            }
            else
            {
                opened.add (word);
                return 'right';
            }
        }
        return '';
    }

    private to_words (text: string) {
        let words: Word[] = [];
        const text_words = text.trim ().split (' ');
        let sticky_right_set = false;
        let opened = new Set<string>();
        for (let i = 0; i < text_words.length; ++i) {
            let elements = text_words[i].split ('\t');
            let sticky = this.isSticky (elements[0], opened);
            let w: Word = {word: '', _sticky: (sticky === 'left' || sticky_right_set)};
            sticky_right_set = (sticky === 'right');
            for (let ipattr = 0; ipattr < this.pattrs_to_show.length; ++ipattr)
                w[this.pattrs_to_show[ipattr]] = elements[ipattr];
            words.push (w)
        }

        return words;
    }

    protected override get_aoa (entries: ConcordanceEntry[]) {
        let data = [];
        let header = ['Left Context', 'Match', 'Match (lemma)', 'Right Context'];
        for (let aligned of entries[0].aligned)
            header.push (aligned.corpus_name);
        for (let meta_key in entries[0].meta)
            header.push (meta_key);
        data.push (header);
        for (let entry of entries.filter (el => el !== undefined)) {
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

    /* Methods for all the modes */

    cutContext (context: Word[], side: string) {
        if (side === 'left')
            return context.slice (-this.maxContextSize - 1);
        else (side == 'right')
            return context.slice (0, this.maxContextSize + 1);
    }
    
    toList (meta: metaObj) {
        let lst = [];
        for (let name in meta)
            if (meta[name].show)
                lst.push ({name: meta[name].description !== '' ? meta[name].description : name, value: meta[name].value});

        return lst;
    }

    /* Methods for the spoken mode */

    get_audio (row: ConcordanceEntry) {
        return `${BASE_URL}/audio/${row.meta[this.audio_attribute].value}`;
    }

    play (index: number, row: ConcordanceEntry) {
        const audioPath = this.get_audio (row);
        if (this.audio) {
            this.audio.pause ();
        }
        if (this.currently_playing === row.id) {
            this.currently_playing = '';
            this.row_icon_states[index].playing = false;
        }
        else {
            if (this.currently_playing) {
                for (let state of this.row_icon_states)
                    if (state.playing)
                        state.playing = false;
            }
            this.currently_playing = row.id;
            this.row_icon_states[index].playing = true;
            this.audio = new Audio (audioPath);
            this.audio.play().catch (() => {
                this.row_icon_states[index].playing = false; // Reset state on error
            });
            this.audio.onended = () => {
                console.log ('end, ', index);
                this.row_icon_states[index].playing = false;
                this.currently_playing = '';
            };
        }
      }

    /* Methods for the parallel mode */

    control_locked (index: number) {
        const found = this.locked.indexOf (index);
        if (found === -1) {
            this.locked.push (index);
            this.locked.sort ();
        }
        else {
            this.locked.splice (found, 1);
        }
    }

    get_column_width () {
        const val = (100 - 8) / this.max_visible;
        return `${val}%`;
    }

    get_visible_columns () {
        let visible = this.locked.slice ();
        const usedIndexes = new Set (visible);
        for (let i = 0; visible.length < this.max_visible; ++i)
            if (!usedIndexes.has (i))
                visible.push (i);
        return visible;
    }

    shift_possible (direction: Direction) {
        console.log ('dir:', direction);
        if (this.locked.length === this.max_visible)
            return false;
        const not_locked = this.visible_columns.filter (el => !this.locked.includes (el));  
        const start = direction === 'left' ? 0 : not_locked[not_locked.length - 1] + 1;
        const end = direction === 'left' ? not_locked[0] : this.corpora.length;
        for (let i = start; i < end; ++i)
            if (!this.locked.includes (i))
                return true;
        return false;
    }

    shift (direction: Direction) {
        let available = [];
        const start = direction === 'left' ? Math.max (0, this.visible_columns[0] - this.max_visible) : this.visible_columns[0];
        const end = direction === 'left' ? this.visible_columns[this.visible_columns.length - 1] : Math.min (this.visible_columns[this.visible_columns.length - 1] + this.max_visible, this.corpora.length - 1);
        for (let i = start; i <= end; ++i)
            if (!this.locked.includes (i))
                available.push (i);
        for (let i = 0; i < this.visible_columns.length; ++i) {
            if (!this.locked.includes (this.visible_columns[i])) {
                const place = available.indexOf (this.visible_columns[i]);
                this.visible_columns[i] = available[place + (direction === 'left' ? -1 : 1)];
            }
        }
        this.visible_columns.sort ();
    }

    
}
