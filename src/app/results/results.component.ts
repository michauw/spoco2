import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActionService } from '../action.service';
import { ConfigService } from '../config.service';
import { OutputLine, PAttribute, SAttribute, Word } from '../dataTypes';
import { QueryKeeperService } from '../query-keeper.service';

@Component({
    selector: 'spoco-results',
    templateUrl: './results.component.html',
    styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit {

    private get_meta (text: string, mode: string) {
        const pattern_html = /&lt;(.*?) (.*?)&gt;/g
        let meta: {[key: string]: string} = {};
        let match;
        let end = 0;
        while ((match = pattern_html.exec (text)) !== null) {
            meta[match[1]] = match[2];
        }

        return meta;
    }

    private parse_results (data: any, mode = 'html') {
        let output: OutputLine[] = [];
        if (mode !== 'html')
            for (let line of data.split ('\n')) {
                output.push ({left_context: [], match: line, right_context: [], id: '-1', meta: {}});
            }
        else {
            const lines = data.split ('\n');
            const pattern = /^<LI><EM>(\d+):<\/EM>(?:<EM>(.*?)<\/EM>)? *(.*)<B>(.*)<\/B>(.*)/;   // won't work with no metadeta set
            for (let i = 1; i < lines.length - 2; ++i) {
                let line = lines[i];
                let line_out: OutputLine = {left_context: [], match: [], right_context: [], id: '', meta: {}};
                const match = pattern.exec (line);
                if (!match)
                    continue;
                let meta = {};
                if (match[2] !== undefined)
                    meta = this.get_meta (match[2], 'html')
                let parts = match.slice (3);    // left_context ; match ; right context
                for (let ipart = 0; ipart < parts.length; ++ipart) {
                    let words: Word[] = [];
                    for (let token of parts[ipart].split (' ')) {
                        let elements = token.split ('/');
                        let w: Word = {word: ''};
                        for (let ipattr = 0; ipattr < this.pattrs_to_show.length; ++ipattr)
                            w[this.pattrs_to_show[ipattr]] = elements[ipattr];
                        words.push (w)
                    }
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
                output.push (line_out);
            }
        }

        return output;
    }

    constructor(
        private queryKeeper: QueryKeeperService, 
        private config: ConfigService, 
        private http: HttpClient,
        private actions: ActionService
    ) { }

    ngOnInit(): void {

        const corpusType = this.config.fetch ('corpusType');
        if (corpusType == 'mono')
            this.actions.setDisplayMode ('kwic');
        else
            this.actions.setDisplayMode ('plain');
        console.log ('type', corpusType);
        let query = null;
        let mock = false;
        try {
            query = this.queryKeeper.getCorpusQueries ();            
        }
        catch (error) {
            mock = true;
        }
        this.results = [];
        this.results_fetched = false;
        this.pattrs_to_show = this.config.fetch ('positionalAttributes').filter ((el: PAttribute) => el.inResults).map ((el: PAttribute) => el.name);
        if (!this.pattrs_to_show.length || this.pattrs_to_show[0] !== 'word')
            this.pattrs_to_show = ['word'].concat (this.pattrs_to_show);
        const cwb_settings = this.config.fetch ('cwb');
        let sattrs_to_show = this.config.fetch ('structuralAttributes').filter ((el: SAttribute) => el.inResults || el.context).map ((el: SAttribute) => el.name);
        let post_data = {query: query, paths: cwb_settings.paths, context: cwb_settings.context, to_show: this.pattrs_to_show, print_structures: sattrs_to_show};
        if (mock) {
            this.pattrs_to_show = ['word', 'lemma', 'tag'];
            sattrs_to_show = ['s_id', 'meta_autor', 'meta_tytul', 'meta_data_wydania', 'meta_data_tlumaczenia'];
            post_data = {
                query: {primary: {corpus: 'boy', query: '[word="pies"%c]'}, secondary: []},
                paths: {'cqp-path': 'D:\\Praca\\narzedzia\\cwb\\cwb3.4\\bin\\cqpcl', 'registry-path': 'D:\\Praca\\zasoby\\korpusy\\boy\\Registry'},
                context: '1s',
                to_show: this.pattrs_to_show,
                print_structures: sattrs_to_show
            };
            
        }
        this.results = [];
        // console.log ('data:', post_data);
        this.http.post ('http://localhost:8000/results', post_data).subscribe (responseData => {
            // console.log ('results:', responseData, typeof responseData);
            this.results = this.parse_results (responseData);
            this.results_fetched = true;
            console.log ('parsed', this.results);
        });
  }

  results_fetched: Boolean;
  results: OutputLine[];
  pattrs_to_show: string[];

}
