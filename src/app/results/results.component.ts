import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActionService } from '../action.service';
import { ConfigService } from '../config.service';
import { CorporaKeeperService } from '../corpora-keeper.service';
import { corpusType, ConcordanceEntry, PAttribute, SAttribute, Word } from '../dataTypes';
import { QueryKeeperService } from '../query-keeper.service';
import { Subscription } from 'rxjs';
import { utils, writeFile, writeFileXLSX } from 'xlsx';


interface Tmp {
    [key: string]: string;
}

@Component({
    selector: 'spoco-results',
    templateUrl: './results.component.html',
    styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit, OnDestroy {

    private get_meta (text: string, mode: string) {
        const pattern_html = /&lt;(.*?) (.*?)&gt;/g
        let meta: {[key: string]: string} = {};
        let match;
        let end = 0;
        while ((match = pattern_html.exec (text)) !== null) {
            let desc = match[1];
            for (let sattr of this.sattrs_to_show) {
                if (match[1] == sattr.name) {
                    desc = sattr.description;
                    break;
                }
            }
            meta[desc] = match[2];
        }

        return meta;
    }

    private to_words (text: string) {
        let words: Word[] = [];
        for (let token of text.split (' ')) {
            let elements = token.split ('/');
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
        let meta = {};
        if (match[2] !== undefined)
            meta = this.get_meta (match[2], 'html')
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
        line_out['meta'] = meta;
        line_out['aligned'] = [];

        return line_out;
    }

    private parse_parallel_line (batch: string[], no_of_corpora: number) {
        const pattern_aligned = /<P><B><EM>--&gt;(.*?)<\/EM><\/B>&nbsp;&nbsp;(.*)/
        let parsed: ConcordanceEntry = {left_context: [], match: [], right_context: [], id: '', meta: {}, aligned: [], selected: false };
        for (let i = 0; i < no_of_corpora; ++i) {
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

    private parse_results (data: any, mode = 'html', no_of_corpora = 1) {
        let output: ConcordanceEntry[] = [];
        const corpusType = (no_of_corpora === 1) ? 'mono' : 'parallel';
        if (mode !== 'html')
            for (let line of data.split ('\n')) {
                output.push ({left_context: [], match: line, right_context: [], id: '-1', meta: {}, aligned: [], selected: false });
            }
        else {
            const lines = data.split ('\n');
            let parallel_batch = [];
            for (let i = 1; i < lines.length - 2; ++i) {
                let line = lines[i];
                if (!line)
                    continue;
                if (corpusType === 'mono'){
                    const parsed = this.parse_primary_line (line);
                    if (parsed.id)
                        output.push (parsed);
                }
                else {
                    parallel_batch.push (line);
                    if (parallel_batch.length === no_of_corpora) {
                        const parsed = this.parse_parallel_line (parallel_batch, no_of_corpora);
                        if (parsed.id)
                            output.push (parsed);
                        parallel_batch = [];
                    }
                }
            }
        }

        return output;
    }

    constructor(
        private queryKeeper: QueryKeeperService, 
        private config: ConfigService,
        private corporaKeeper: CorporaKeeperService, 
        private http: HttpClient,
        private actions: ActionService
    ) { }

    ngOnInit(): void {

        this.corpusType = this.config.fetch ('corpusType');
        if (this.corpusType == 'mono')
            this.actions.setDisplayMode ('kwic');
        else
            this.actions.setDisplayMode ('plain');
        if (!this.corpusType.length)
            this.corpusType = 'parallel';
        this.sliceSize = this.config.fetch ('preferences')['results_per_page'];
        const corpora = this.corporaKeeper.getCorpora ();
        let query = null;
        let mock = false;
        try {
            query = this.queryKeeper.getCorpusQueries ();            
        }
        catch (error) {
            mock = true;
        }
        this.results = [];
        this.currentSlice = [];
        this.results_fetched = false;
        this.pattrs_to_show = this.config.fetch ('positionalAttributes').filter ((el: PAttribute) => el.inResults).map ((el: PAttribute) => el.name);
        if (!this.pattrs_to_show.length || this.pattrs_to_show[0] !== 'word')
            this.pattrs_to_show = ['word'].concat (this.pattrs_to_show);
        const cwb_settings = this.config.fetch ('cwb');
        this.sattrs_to_show = this.config.fetch ('structuralAttributes').filter ((el: SAttribute) => el.inResults || el.context);
        let sattr_names = this.sattrs_to_show.map (el => el.name);
        let post_data = {query: query, paths: cwb_settings.paths, context: cwb_settings.context, to_show: this.pattrs_to_show, print_structures: sattr_names, corpora: corpora};
        if (mock) {
            this.pattrs_to_show = ['word', 'lemma', 'tag'];
            const post_data_mono = {
                query: {primary: {corpus: 'boy', query: '[word="pies"%c]'}, secondary: []},
                paths: {'cqp-path': 'D:\\Praca\\narzedzia\\cwb\\cwb3.4\\bin\\cqpcl', 'registry-path': 'D:\\Praca\\zasoby\\korpusy\\boy\\Registry'},
                context: '1s',
                to_show: this.pattrs_to_show,
                print_structures: ['s_id', 'meta_autor', 'meta_tytul', 'meta_data_wydania', 'meta_data_tlumaczenia'],
                corpora: corpora
            };
            const post_data_parallel = {
                query: {primary: {corpus: 'letrint_en', query: '[word="judge"%c]'}, secondary: []},
                paths: {'cqp-path': 'D:\\Praca\\narzedzia\\cwb\\cwb3.4\\bin\\cqpcl', 'registry-path': 'D:\\Praca\\Genewa\\Corpus\\Registry'},
                context: '1s',
                to_show: this.pattrs_to_show,
                print_structures: ['Align_id', 'meta_organisation', 'meta_publication_date', 'meta_legal_function', 'meta_textual_genre', 'meta_subgenre', 'meta_title_en', 'meta_title_es', 'meta_title_fr'],
                corpora: corpora
            };
            if (this.corpusType == 'mono')
                post_data = post_data_mono;
            else
                post_data = post_data_parallel;
            
        }
        this.results = [];
        this.http.post ('http://localhost:8000/results', post_data).subscribe (responseData => {
            // console.log ('results:', responseData, typeof responseData);
            this.results = this.parse_results (responseData, 'html', corpora.length);
            this.results_fetched = true;
            this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        });
        this.downloadResultsSub = this.actions.downloadResults.subscribe (mode => this.downloadResults (mode));
    }
    ngOnDestroy(): void {
        this.downloadResultsSub.unsubscribe ();
    }

    results_fetched: Boolean;
    results: ConcordanceEntry[];
    currentSlice: ConcordanceEntry[];
    currentSliceBegin: number = 0;
    sliceSize: number = 20;
    pattrs_to_show: string[];
    sattrs_to_show: SAttribute[];
    corpusType: corpusType;
    downloadResultsSub: Subscription; 

    pageChanged (pageNumber: number) {
        this.currentSliceBegin = (pageNumber - 1) * this.sliceSize;
        this.currentSlice = this.results.slice (this.currentSliceBegin, this.currentSliceBegin + this.sliceSize);
        window.scroll({ 
            top: 0, 
            left: 0, 
            behavior: 'auto' 
          });
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
}
