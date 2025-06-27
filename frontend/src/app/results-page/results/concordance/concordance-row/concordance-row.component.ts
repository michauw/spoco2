import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, HostBinding } from '@angular/core';
import { AnnotationDisplay, ConcordanceEntry, corpusType, Word } from 'src/app/dataTypes';
import { faPlus, faPlay, faStop, faArrowLeftLong, faArrowRightLong, faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { EventEmitter } from '@angular/core';
import { ActionService } from 'src/app/action.service';
import { AnnotatedWordComponent } from './annotated-word/annotated-word.component';
import { trigger, transition, style, animate } from '@angular/animations';

type Sides = 'left' | 'central' | 'right';
(window as any).AnnotatedWordComponent = AnnotatedWordComponent;

@Component({
    selector: 'spoco-concordance-row',
    templateUrl: './concordance-row.component.html',
    styleUrl: './concordance-row.component.scss',
    animations: [
        trigger ('fadeInOut', [
            transition (':enter', [ // when element is added
                style ({ opacity: 0, height: '0' }),
                animate ('300ms ease-out', style ({ opacity: 1, height: '*' }))
            ]),
            transition (':leave', [ // when element is removed
                animate ('300ms ease-in', style ({ opacity: 0, height: '0' }))
            ])
        ])
    ],
    standalone: false
})
export class ConcordanceRowComponent implements OnInit, OnChanges {

    @Input () row: ConcordanceEntry;
    @Input () mode: 'plain' | 'kwic' | 'extended' | 'aligned';
    @Input () corpusType: corpusType;
    @Input () annotationDisplay: AnnotationDisplay;
    @Input () currentLayer: string;
    @Input () pattrs_to_show: string[];
    @Input () meta: { name: string; value: string; }[];
    @Input () currentlyPlaying: number;
    @Input () contextExhausted: {left: boolean, right: boolean};
    @Input () words?: Word[]
    @Input () speaker?: string;
    @Input () truncateActive?: boolean;
    @Output () broaderContextRequest: EventEmitter<'left' | 'right' | 'both'> = new EventEmitter<'left' | 'right' | 'both'> ();
    @Output () audioEvent: EventEmitter<number> = new EventEmitter<number> ();
    @Output () expanded: EventEmitter<void> = new EventEmitter<void> ();

    // @HostBinding ('class.row') // needed for proper rendering Bootstrap grid classes ('kwic' mode)
    get isKwicMode (): boolean {
        return this.mode === 'kwic';
    }

    maxContextSize: number = 8;
    immediate_context: {left: Word[], right: Word[]};
    rowTruncated = false;
    TRUNC_THRESHOLD = 40;

    icons = {
      'play': faPlay, 
      'stop': faStop,
      'context_both': faPlus, 
      'context_left': faArrowLeftLong,
      'context_right': faArrowRightLong,
      'showAll': faEllipsis
    }

    constructor (private actions: ActionService) {}

    ngOnInit(): void {
        if (this.speaker === undefined)
            this.speaker = '';
        this.getContext ();
        if (this.truncateActive === undefined)
            this.truncateActive = false;
        const rowLength = (this.mode !== 'aligned') ? (this.row.left_context.length + this.row.match.length + this.row.right_context.length) : this.words!.length;
        this.rowTruncated = this.truncateActive && rowLength  > this.TRUNC_THRESHOLD;
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

    rowExpanded () {
        this.rowTruncated = false;
        this.expanded.emit ();
    }

    truncate (words: Word[], side: 'left' | 'right' | 'central') {
        if (!(this.truncateActive && this.rowTruncated))
            return words;
        let start: number;
        switch (side) {
            case 'left':
                start = words.length - this.TRUNC_THRESHOLD;
                break;
            case 'right':
                start = 0;
                break;
            case 'central':
                start = Math.floor (words.length / 2);
        }
        const end = start + this.TRUNC_THRESHOLD;

        return words.slice (start, end);
    }
}

