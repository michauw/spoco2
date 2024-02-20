import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ActionService } from 'src/app/action.service';
import { ConfigService } from 'src/app/config.service';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { ConcordanceEntry, Corpus, Word, metaObj } from 'src/app/dataTypes';
import { BASE_URL } from 'src/environments/environment';
import { faPlus, faMinus, faPlay, faStop } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'spoco-concordance-spoken',
  templateUrl: './concordance-spoken.component.html',
  styleUrls: ['./concordance-spoken.component.scss']
})
export class ConcordanceSpokenComponent implements OnInit, OnChanges, OnDestroy {


    @Input() results: ConcordanceEntry[];
    @Input() pattrs_to_show: string[];
    mode: string;
    showMeta: boolean;
    audio_attribute: string;
    audio_path: string;
    displayModeChangedSub: Subscription;
    showMetaChangedSub: Subscription;
    maxContextSize: number;
    corpora: Corpus[];
    row_icon_states: {playing: boolean, extended: boolean}[];
    playing: string = '';
    audio: HTMLAudioElement | null = null;
    currently_playing: string = '';
    icons = {'plus': faPlus, 'minus': faMinus, 'play': faPlay, 'stop': faStop}

    constructor(private actions: ActionService, private corporaKeeper: CorporaKeeperService, private config: ConfigService, private sanitizer: DomSanitizer) { }

    ngOnInit(): void {
        const config_audio = this.config.fetch ('audio');
        this.mode = this.actions.displayMode;
        this.showMeta = false;
        this.maxContextSize = 8;
        this.audio_attribute = config_audio['attribute'];
        this.audio_path = config_audio['data-dir'];
        this.corpora = this.corporaKeeper.getCorpora ();
        this.displayModeChangedSub = this.actions.displayModeChanged.subscribe (mode => this.mode = mode);
        this.showMetaChangedSub = this.actions.showMetaChanged.subscribe (show => this.showMeta = show);
    }

    ngOnChanges(): void {
        this.row_icon_states = this.results.map (() => ({ playing: false, extended: false }));
        if (this.audio)
            this.audio.pause ();
    }

    ngOnDestroy(): void {
        this.displayModeChangedSub.unsubscribe ();
        this.showMetaChangedSub.unsubscribe ();
    }

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

    get_audio (row: ConcordanceEntry) {
        return `${BASE_URL}/audio/${this.audio_path}/${row.meta[this.audio_attribute].value}`;
    }

    get_tooltip (word: Word) {
        let tooltip = [];
        for (let pattr of this.pattrs_to_show)
            if (pattr !== 'word')
                tooltip.push (word[pattr]);

        return tooltip.join (' : ');
    }

    // $scope.play = function ($event, meta) {
    //     var audio_path = $scope.getAudioSrc (meta);
    //     var elem = $event.currentTarget;
    //     if ($scope.playing == elem.id) {
    //         $scope.playing = '';
    //         angular.element (elem).removeClass ('fa-stop-circle').addClass ('fa-play-circle');
    //         $scope.audio.pause ();
    //     }
    //     else {
    //             if ($scope.playing != '') {
    //                 $scope.audio.pause ();
    //                 angular.element ('#' + $scope.playing).removeClass ('fa-stop-circle').addClass ('fa-play-circle');
    //             }
    //             $scope.audio = new Audio (audio_path);
    //             $scope.playing = elem.id;
    //             var el = angular.element (elem);
    //             $scope.audio.play ()
    //             .then (function () {
    //                 el.removeClass ('fa-play-circle').addClass ('fa-stop-circle');
    //             })
    //             .catch (function () {
    //                 el.removeClass ('fa-play-circle').addClass ('fa-times-circle');
    //                 $scope.playing = '';
    //             });
    //             $scope.audio.onended = function () {
    //                 var el = angular.element (elem).removeClass ('fa-stop-circle').addClass ('fa-play-circle')
    //                 $scope.playing = elem.id;
    //             }
    //         }
    // }

    // play (index: number, row: ConcordanceEntry) {
    //     const audio_path = this.get_audio (row);
    //     if (this.playing === row.id) {
    //         this.row_icon_states[index]['playing'] = false;
    //         this.audio.stop ();

    //     }
    // }

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

}
