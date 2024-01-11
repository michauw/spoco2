import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ActionService } from 'src/app/action.service';
import { ConfigService } from 'src/app/config.service';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { ConcordanceEntry, Corpus, Word, metaObj } from 'src/app/dataTypes';

@Component({
  selector: 'spoco-concordance-spoken',
  templateUrl: './concordance-spoken.component.html',
  styleUrls: ['./concordance-spoken.component.scss']
})
export class ConcordanceSpokenComponent implements OnInit {


    @Input() results: ConcordanceEntry[];
    mode: string;
    showMeta: boolean;
    audio_attribute: string;
    audio_path: string;
    displayModeChangedSub: Subscription;
    showMetaChangedSub: Subscription;
    maxContextSize: number;
    corpora: Corpus[];

    constructor(private actions: ActionService, private corporaKeeper: CorporaKeeperService, private config: ConfigService, private sanitizer: DomSanitizer) { }

    ngOnInit(): void {
        const config_audio = this.config.fetch ('audio');
        this.mode = this.actions.displayMode;
        this.showMeta = false;
        this.maxContextSize = 8;
        this.audio_attribute = config_audio['attribute'];
        this.audio_path = config_audio['path'];
        this.corpora = this.corporaKeeper.getCorpora ();
        this.displayModeChangedSub = this.actions.displayModeChanged.subscribe (mode => this.mode = mode);
        this.showMetaChangedSub = this.actions.showMetaChanged.subscribe (show => this.showMeta = show);
    }

    ngOnDestroy(): void {
        this.displayModeChangedSub.unsubscribe ();
        this.showMetaChangedSub.unsubscribe ();
    }

    cutContext (context: Word[], side: string) {
        console.log ('r:', this.results[0]['left_context'][0]);
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

    get_audio (row: ConcordanceEntry) {
        const url = '/assets/audioBits/' + row.meta[this.audio_attribute].value;
        return url;
    }

}
