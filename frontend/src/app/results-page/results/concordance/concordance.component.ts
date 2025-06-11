import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ResultsComponent, postData } from '../results.component';
import { AnnotationDisplay, ConcordanceEntry, ContextEntry, Corpus, PAttribute, Query, SAttribute, Word, metaObj } from 'src/app/dataTypes';
import { HttpClient, HttpDownloadProgressEvent, HttpEvent, HttpEventType } from '@angular/common/http';
import { BASE_URL } from 'src/environments/environment';
import { Observable, Subject, Subscription } from 'rxjs';
import { faArrowAltCircleLeft, faArrowAltCircleRight, faPlus, faMinus, faPlay, faStop, faArrowLeftLong, faArrowRightLong } from '@fortawesome/free-solid-svg-icons';
import { MatSnackBar } from '@angular/material/snack-bar';

interface postDataConcordance extends postData {
    size_limit?: number;
    chunk_size?: number;
    end_chunk_size?: number
    mode?: 'full' | 'partial';
    separator?: string;
}

interface postDataContext extends postData {
    id: string;
    direction: 'left' | 'right' | 'both';
    audio?: {file: string, speaker: string};
}

type results_data = {'query': string, 'number_of_results': number};
type Direction = 'left' | 'right';

@Component({
    selector: 'spoco-concordance',
    templateUrl: './concordance.component.html',
    styleUrl: './concordance.component.scss',
    standalone: false
})
export class ConcordanceComponent extends ResultsComponent<ConcordanceEntry> implements OnInit, OnDestroy {

    displayMode: string;
    showMeta: boolean;
    parallelCorpora: Corpus[];
    max_visible: number;
    token_count: number = 0;
    maxContextSize: number;
    locked: number[];
    visible_columns: number[];
    displayLayers: string[];
    annotationDisplay: AnnotationDisplay[] = ['tooltip', 'mixed', 'inline'];
    currentAnnotationDisplay: AnnotationDisplay;
    currentLayer: string;
    row_icon_states: {playing: boolean, extended: boolean, no_context: {left: boolean, right: boolean}, child: boolean[]}[] = [];
    playing: string = '';
    audio: HTMLAudioElement | null = null;
    audio_file: string;
    audio_speaker: string;
    audio_path: string;
    audioEvent$ = new Subject<'play' | 'pause'>;
    @ViewChildren('bigAudioControl') audioRefs!: QueryList<ElementRef<HTMLAudioElement>>;
    currently_playing: {parent: number, child: number} = {parent: -1, child: -1};
    icons = {'plus': faPlus, 'minus': faMinus, 'play': faPlay, 'stop': faStop}
    arrow_left = faArrowAltCircleLeft;
    arrow_right = faArrowAltCircleRight;
    displayModeChangedSub: Subscription;
    displayLayerChangedSub: Subscription;
    showMetaChangedSub: Subscription;
    annotationDisplayChangedSub: Subscription;
    contextIcons = {'both': faPlus, 'left': faArrowLeftLong, 'right': faArrowRightLong};
    
    constructor (private http: HttpClient, private snack: MatSnackBar) {
        super (...ResultsComponent.inject_dependencies ());
    }

    override ngOnInit(): void {
        super.ngOnInit ();
        let post_data = this.get_post_data ('full');
        let url = `${BASE_URL}/concordance`;
        this.original_query = post_data.query.primary.query;
        this.displayLayers = this.config.fetch ('layers') ?? [];
        this.currentLayer = this.config.fetch ('displayLayer', true);
        if (this.displayLayers.length && !this.currentLayer) {
            this.currentLayer = this.displayLayers[0];
            this.config.store ('displayLayer', this.currentLayer, true);
        }
        if (this.corpusType === 'spoken') {
            const config_audio = this.config.fetch ('audio');
            this.audio_speaker = config_audio.speaker;
            this.audio_file = config_audio.file;
            this.audio_path = config_audio['data-dir'];
        }
        this.make_request (url, post_data, 'full');
        this.displayMode = this.config.fetch ('resDisplayMode', true);
        if (!this.displayMode) {
            this.displayMode = this.corpusType === 'mono' ? 'kwic' : 'plain';
            this.config.store ('resDisplayMode', this.displayMode, true);
        }
        const storedShowMeta = localStorage.getItem ('showMeta');
        if (storedShowMeta && storedShowMeta === 'true')
            this.showMeta = true;
        else
            this.showMeta = false;
        this.currentAnnotationDisplay = this.config.fetch ('annotationDisplay', true);
        if (!this.currentAnnotationDisplay) {
            this.currentAnnotationDisplay = 'tooltip';
            this.config.store ('annotationDisplay', this.currentAnnotationDisplay, true);
        }
        this.max_visible = 3;
        this.maxContextSize = 8;
        this.parallelCorpora = this.corpusType === 'parallel' ? this.corporaKeeper.getCorpora (true) : [];
        this.locked = [0];
        this.visible_columns = this.get_visible_columns ();
        
        this.displayModeChangedSub = this.actions.displayModeChanged.subscribe (() => {
            this.displayMode = this.displayMode === 'kwic' ? 'plain' : 'kwic';
            this.config.store ('resDisplayMode', this.displayMode, true);
            if (this.corpusType === 'spoken')
                this.pauseAudio ();
        });
        this.showMetaChangedSub = this.actions.showMetaChanged.subscribe (() => {
            this.showMeta = !this.showMeta;
        });
        this.displayLayerChangedSub = this.actions.displayLayerChanged.subscribe (() => {
            if (!this.displayLayers.length)
                return;
            for (let i = 0; i < this.displayLayers.length; ++i) {
                if (this.displayLayers[i] === this.currentLayer) {
                    if (i === this.displayLayers.length - 1)
                        this.currentLayer = this.displayLayers[0];
                    else
                        this.currentLayer = this.displayLayers[i + 1];
                    this.config.store ('displayLayer', this.currentLayer, true);
                    break;
                }
            }
        });
        this.annotationDisplayChangedSub = this.actions.annotationDisplayChanged.subscribe ((setting) => {
            this.currentAnnotationDisplay = setting;
        });
    }

    ngOnChanges(): void {
        this.row_icon_states = this.results.map (() => ({ playing: false, extended: false, no_context: {left: false, right: false}, child: [false] }));
        if (this.corpusType === 'spoken' && this.audio)
            this.audio.pause ();
    }

    getContext (ind: number, direction: 'left' | 'right' | 'both') {
        let result: ConcordanceEntry = this.currentSlice[ind];
        interface BroadContext {
            primary: {content: string, id: string, speaker?: string, file?: string},
            secondary: {corpus_name: string, content: string}[]
        }
        let to_do: ('left' | 'right')[] = [];
        if (direction === 'both')
            to_do = to_do.concat (['left', 'right']);
        else
            to_do.push (direction);
        let context_errors: string[] = [];
        for (let dir of to_do) {
            let id = result.id;
            if (dir === 'left' && result.broader_context.left.length)
                id = result.broader_context.left[0].id;
            if (dir === 'right' && result.broader_context.right.length)
                id = result.broader_context.right[result.broader_context.right.length - 1].id;

            const post_data = this.get_post_data_context (id, dir);
            const url = BASE_URL + '/context';
            this.http.post<BroadContext> (url, post_data).subscribe ({
                next: 
                    (response) => {
                        if (response.primary) {
                            const words: Word[] = this.to_words (response.primary.content);
                            const ce: ContextEntry = {content: words, speaker: response.primary.speaker, file: response.primary.file, id: response.primary.id}
                            const ind_res = this.currentSliceBegin + ind;
                            if (dir === 'left') {
                                result.broader_context.left.splice (0, 0, ce);
                                this.row_icon_states[ind_res].child.splice (0, 0, false);
                            }
                            else {
                                result.broader_context.right.push (ce);
                                this.row_icon_states[ind_res].child.push (false)
                            }
                            for (let aligned of response.secondary) {
                                for (let res_corpus of result.aligned) {
                                    if (res_corpus.corpus_name === aligned.corpus_name) {
                                        const content: Word[] = this.to_words (aligned.content);
                                        if (dir === 'left')
                                            res_corpus.content = content.concat (res_corpus.content);
                                        else
                                            res_corpus.content = res_corpus.content.concat (content);
                                        break;
                                    }
                                    
                                }
                            }
                            this.currentSlice[ind] = {...result};
                        }
                        else {
                            this.row_icon_states[this.currentSliceBegin + ind].no_context[dir] = true;
                            context_errors.push (dir);
                        }
                        if (dir === to_do[to_do.length -1] && context_errors.length) {
                            const more = result.broader_context.left.length + result.broader_context.right.length > 0 ? ' more ' : ' ';
                            const sides = to_do.filter (el => result.broader_context[el].length === 0);
                            const side = (sides.length === 1) ? ` (${sides[0]})` : '';
                            const message = `No${more}context found${side}.`;
                            this.snack.open (message, 'x', {
                                duration: 4000,
                                verticalPosition: 'top',
                            });
                        }
                    },
                error: (err) => {
                    console.log ('context error');
                }
            });
        }
    }

    onBigAudioPlay () {
        this.pauseAudio (false);
    }

    onChildAudioEvent (row: ConcordanceEntry, ind: number, child_ind: number) {
        this.audio?.pause ();       
        this.playStop (row, ind, child_ind);
    }

    getMeta (meta: metaObj) {
        if (this.showMeta)
            return this.toList (meta);
        return [];
    }

    private toList (meta: metaObj) {
        let lst = [];
        for (let name in meta)
            if (meta[name].show)
                lst.push ({name: meta[name].description !== '' ? meta[name].description : name, value: meta[name].value});

        return lst;
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

    protected override sort_results (by: 'left_context' | 'match' | 'right_context', in_context: boolean = false): void {
        if (this.sort_ascending === undefined)
            this.sort_ascending = true;
        else
            this.sort_ascending = !this.sort_ascending;
        let ind_a = 0;
        let ind_b = 0;
        this.results.sort ((a, b) => {
            if (in_context && by === 'left_context') {
                ind_a = Math.max (a[by].length - this.maxContextSize - 1, 0);
                ind_b = Math.max (b[by].length - this.maxContextSize - 1, 0);
            }
            if (a[by][ind_a].word.toLocaleLowerCase () < b[by][ind_b].word.toLocaleLowerCase ()) return this.sort_ascending ? -1 : 1;
            if (a[by][ind_a].word.toLocaleLowerCase () > b[by][ind_b].word.toLocaleLowerCase ()) return this.sort_ascending ? 1 : -1;
            return 0;
        });
        this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
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
        
        const base_post_data = super.get_post_data (mode, size);
        const post_data: postDataConcordance = {
            ...base_post_data,
            size_limit: this.SIZE_LIMIT,
            chunk_size: this.CHUNK_SIZE,
            end_chunk_size: this.END_CHUNK_SIZE,
            mode: mode,
            separator: this.STREAM_SEPARATOR_TEXT
        }

        return post_data;
    }

    private get_post_data_context (token_id: string, direction: 'left' | 'right') {
        const post_data: postDataContext = {
            query: {} as Query,
            corpora: this.corpora,
            id: token_id,
            direction: direction,
        }
        if (this.corpusType === 'spoken') {
            post_data.audio = {file: this.audio_file, speaker: this.audio_speaker};
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
                                this.row_icon_states = this.results.map (() => ({ playing: false, extended: false, no_context: {left: false, right: false}, child: [false] }));
                                this.results_updated_event.emit (this.results_number);
                            }
                            else {
                                count += 1;
                                if (line.length)
                                    batch.push (line);
                                if (batch.length === this.corpora.length) {
                                    this.results[this.results_position++] = batch.length === 1 ? this.parse_primary_line (batch[0]) : this.parse_parallel_batch (batch);
                                    this.token_count += this.count_tokens (this.results[this.results_position - 1]);
                                    batch = [];
                                    // console.log ('res:', count);
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

    private count_tokens (r: ConcordanceEntry) {
        let count = r.left_context.length + r.match.length + r.right_context.length;
        for (let alg of r.aligned)
            count += alg.content.length;
        return count;
    }

    private parse_primary_line (line: string): ConcordanceEntry {
        const pattern = /^<LI><EM>(\d+):<\/EM>(?:<EM>(.*?)<\/EM>)? *(.*)<B>(.*)<\/B>(.*)/;
        let line_out: ConcordanceEntry = {
            left_context: [], 
            match: [], 
            right_context: [], 
            id: '', 
            meta: {}, 
            aligned: [], 
            selected: false, 
            broader_context: {left: [], right: []}
        };
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
        const pattern_aligned = /<P><B><EM>--&gt;(.*?):<\/EM><\/B>&nbsp;&nbsp;(.*)/
        let parsed: ConcordanceEntry = {
            left_context: [], 
            match: [], 
            right_context: [], 
            id: '', 
            meta: {}, 
            aligned: [], 
            selected: false, 
            broader_context: {left: [], right: []}       
        };
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

    private parse_context_line (line: string, direction: 'left' | 'right' | 'both') {
        type contextInstance = {corpus_name: string, content: string, number?: string, speaker?: string, file?: string};

        const primaryRegex = /^(\d+):\s*(?:(<[^>]+>)+:\s*)?(.*)$/;
        const secondaryRegex = /^-->(\w+):\s*(.*)$/;

        const primaryMatch = line.match (primaryRegex);
        
        if (primaryMatch) {
            const [, number, sattrRaw, content] = primaryMatch;

            const sattr_matches: Record<string, string> = {};
            const attrRegex = /<([^>]+)>/g;
            let match;
            while ((match = attrRegex.exec(sattrRaw)) !== null) {
                const [key, ...rest] = match[1].split (' ');
                sattr_matches[key] = rest.join (' ');
            }

            const result: contextInstance = {
                corpus_name: 'primary',
                content: content,
                number: number
            };

            if (sattr_matches[this.audio_speaker]) {
                result.speaker = sattr_matches[this.audio_speaker];
            }

            if (sattr_matches[this.audio_file]) {
                result.file = sattr_matches[this.audio_file];
            }

            return result;
        }

        // Secondary format
        const secondaryMatch = line.match (secondaryRegex);
        if (secondaryMatch) {
            const [, corpus_name, content] = secondaryMatch;
            return { corpus_name, content };
        }

        return null;
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

    protected override pageChanged(pageNumber: number): void {
        super.pageChanged (pageNumber);
        this.pauseAudio ();
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
                parsed_entry.push (entry.meta[meta].value);
            }
            data.push (parsed_entry);
        }
        return data;
    }

    isExtended (slice_ind: number) {
        return this.row_icon_states[this.currentSliceBegin + slice_ind].extended;
    }

    toggleExtended (slice_ind: number) {
        this.row_icon_states[this.currentSliceBegin + slice_ind].extended = !this.row_icon_states[this.currentSliceBegin + slice_ind].extended;
    }

    /* Methods for the spoken mode */

    getAudio (slice_index: number, child_index?: number) {
        const row_index = this.currentSliceBegin + slice_index;
        let audioFileName: string;
        if (child_index !== undefined) {
            const lcontext = this.results[row_index].broader_context.left.length;
            if (child_index < lcontext)
                audioFileName = this.results[row_index].broader_context.left[child_index].file!;
            else if (child_index === lcontext)
                audioFileName = this.results[row_index].meta[this.audio_file].value;
            else
                audioFileName = this.results[row_index].broader_context.right[child_index - lcontext - 1].file!;
        }
        else {
            audioFileName = this.results[row_index].meta[this.audio_file].value;
        }
        return `${BASE_URL}/audio/${audioFileName}`;
    }

    getCurrentlyPlaying (slice_ind: number, mode: 'parent' | 'child') {
        const res_ind = this.currentSliceBegin + slice_ind;
        if (mode === 'child' && res_ind === this.currently_playing.parent)
            return this.currently_playing.child;
        else if (mode === 'parent')
            return this.currently_playing.parent;
        return -1;
    }

    private pauseAudio (pause_big = true) {
        this.audio?.pause ();
        if (pause_big) {
            for (let ar of this.audioRefs.toArray ())
                if (!ar.nativeElement.paused)
                    ar.nativeElement.pause ();
        }
        if (this.currently_playing.child >= 0 && this.currently_playing.parent >= 0)
            this.row_icon_states[this.currently_playing.parent].child[this.currently_playing.child] = false;
        else if (this.currently_playing.parent >= 0)
            this.row_icon_states[this.currently_playing.parent].playing = false;
        this.currently_playing = {parent: -1, child: -1};
    }

    playStop (row: ConcordanceEntry, slice_index: number, child_index?: number) {
        const row_index = this.currentSliceBegin + slice_index;
        const in_child = child_index !== undefined;
        let audioAction: 'play' | 'pause';
        if (in_child)
            audioAction = this.row_icon_states[row_index].child[child_index] ? 'pause' : 'play';
        else
            audioAction = this.row_icon_states[row_index].playing ? 'pause' : 'play';
        this.pauseAudio ();
        if (audioAction === 'play') {
            this.currently_playing.parent = row_index;
            if (in_child) {
                this.row_icon_states[row_index].child[child_index] = true;
                this.currently_playing.child = child_index;
            }
            else
                this.row_icon_states[row_index].playing = true;
            const audioPath = this.getAudio (slice_index, child_index)
            this.audio = new Audio (audioPath);
            this.audio.play ().catch (() => {
                this.pauseAudio (); // reset state on error
            });
            this.audio.onended = () => {
                this.pauseAudio ();
            }
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
        const colNumber = Math.min (this.max_visible, this.corpora.length);
        for (let i = 0; visible.length < colNumber; ++i)
            if (!usedIndexes.has (i))
                visible.push (i);
        return visible;
    }

    shift_possible (direction: Direction) {
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
