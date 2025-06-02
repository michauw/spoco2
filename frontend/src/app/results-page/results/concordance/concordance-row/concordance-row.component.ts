import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, HostBinding } from '@angular/core';
import { AnnotationDisplay, ConcordanceEntry, corpusType, metaObj, Word } from 'src/app/dataTypes';
import { faArrowAltCircleLeft, faArrowAltCircleRight, faPlus, faMinus, faPlay, faStop, faArrowLeftLong, faArrowRightLong } from '@fortawesome/free-solid-svg-icons';
import { EventEmitter } from '@angular/core';
import { ActionService } from 'src/app/action.service';
import { BASE_URL } from 'src/environments/environment';
import { Subject } from 'rxjs';

type Sides = 'left' | 'central' | 'right';

@Component({
    selector: 'spoco-concordance-row',
    templateUrl: './concordance-row.component.html',
    styleUrl: './concordance-row.component.scss',
    standalone: false
})
export class ConcordanceRowComponent implements OnInit, OnChanges {

    @Input () row: ConcordanceEntry;
    @Input () mode: 'plain' | 'kwic' | 'extended' | 'aligned';
    @Input () corpusType: corpusType;
    @Input () annotationDisplay: AnnotationDisplay;
    @Input () currentLayer: string;
    @Input () pattrs_to_show: string[];
    @Input () showMeta: boolean;
    @Input () currentlyPlaying: number;
    @Input () contextExhausted: {left: boolean, right: boolean};
    @Input () words?: Word[]
    @Input () speaker?: string;
    @Output () broaderContextRequest: EventEmitter<'left' | 'right' | 'both'> = new EventEmitter<'left' | 'right' | 'both'> ();
    @Output () audioEvent: EventEmitter<number> = new EventEmitter<number> ();

    @HostBinding ('class.row') // needed for proper rendering Bootstrap grid classes ('kwic' mode)
    get isKwicMode (): boolean {
        return this.mode === 'kwic';
    }

    maxContextSize: number = 8;
    immediate_context: {left: Word[], right: Word[]};

    icons = {
      'play': faPlay, 
      'stop': faStop,
      'context_both': faPlus, 
      'context_left': faArrowLeftLong,
      'context_right': faArrowRightLong,
    }

    constructor (private actions: ActionService) {}

    ngOnInit(): void {
        if (this.speaker === undefined)
            this.speaker = '';
        this.getContext ();
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.getContext ();
    }

    broadContextLoaded () {
            return (this.row.broader_context.left.length + this.row.broader_context.right.length) > 0;
        }

    cutImmediateContext (side: string) {
        if (side === 'left')
            return this.row.left_context.slice (-this.maxContextSize - 1);
        else
            return this.row.right_context.slice (0, this.maxContextSize + 1);
    }

    differentSpeaker (ind: number, side: Sides, offset: number) {
        if (this.corpusType !== 'spoken')
            return false;
        const bc = this.row.broader_context;
        if (side === 'left') {
            const icomp = ind + offset;
            let comp;
            if (icomp < 0)
                return true;
            if (icomp >= bc.left.length)
                comp = this.row.meta[this.speaker!].value;
            else
                comp = bc.left[icomp].speaker;
            if (bc.left[ind].speaker != comp)
                return true;
        }
        if (side === 'central') {
            let comp;
            if (offset < 0) {
                if (!bc.left.length)
                    return true;
                comp = bc.left[bc.left.length - 1].speaker;
            }
            else {
                if (!bc.right.length)
                    return true;
                comp = bc.right[0].speaker;
            }
            if (this.row.meta[this.speaker!].value !== comp)
                return true;
        }
        if (side === 'right') {
            let comp;
            const icomp = ind + offset;
            if (icomp < 0) {
                comp = this.row.meta[this.speaker!].value;
            }
            else {
                if (icomp >= bc.right.length)
                    return false;
                comp = bc.right[icomp].speaker;
            }
            if (bc.right[ind].speaker !== comp)
                return true;
        }
        return false;
    }

    getBroaderContext (direction: 'left' | 'right' | 'both') {
        this.broaderContextRequest.emit (direction);
    }

    getContext () {
        if (this.mode !== 'kwic') {
            this.immediate_context = {left: this.row.left_context, right: this.row.right_context};
        }
        else 
            this.immediate_context = {left: this.cutImmediateContext ('left'), right: this.cutImmediateContext ('right')};                
    }

    getControl (side: Sides, ind?: number) {
        if (side === 'central')
            return this.row.broader_context.left.length;
        if (side === 'left')
            return ind!;
        if (side === 'right')
            return this.row.broader_context.left.length + 1 + ind!;
        return 0;
    }

    isPlaying (side: Sides, ind?: number) {
        return this.currentlyPlaying === this.getControl (side, ind);
    }

    playStop (side: Sides, ind?: number) {
        this.audioEvent.emit (this.getControl (side, ind));
    }

    toList (meta: metaObj) {
        let lst = [];
        for (let name in meta)
            if (meta[name].show)
                lst.push ({name: meta[name].description !== '' ? meta[name].description : name, value: meta[name].value});

        return lst;
    }

}

