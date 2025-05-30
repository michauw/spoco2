import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { AnnotationDisplay, Word } from 'src/app/dataTypes';

@Component({
    selector: 'spoco-annotated-word',
    templateUrl: './annotated-word.component.html',
    styleUrl: './annotated-word.component.scss'
})
export class AnnotatedWordComponent implements OnInit, OnChanges {
  
    @Input () word: Word;
    @Input () displayMode: AnnotationDisplay;
    @Input () role: 'broad context' | 'immediate context' | 'match' | 'aligned';
    @Input () toShow: string[];
    @Input () currentLayer: string;
    @Input () highlightOriginal?: boolean;
    
    place: 'tooltip' | 'inline';
    annotation: string;

    ngOnInit(): void {
        this.place = this.getPlace ();
        this.annotation = this.getAnnotation ();
    }

    ngOnChanges (): void {
        this.place = this.getPlace ();
    }

    private getPlace () {
        let place: 'tooltip' | 'inline';
        switch (this.displayMode) {
            case 'tooltip':
                place = 'tooltip';
                break;
            case 'mixed':
                if (this.role === 'match')
                    place = 'inline';
                else
                    place = 'tooltip';
                break;
            case 'inline':
                place = 'inline';
        }

        return place;
    }

    private isPunctuation () {
        const punctuationMarks = new Set([".", ",", "!", "?", ";", ":", "-", "(", ")", "[", "]", "{", "}", "'", "\"", "/", "\\", "|", "@", "#", "$", "%", "&", "*", "~", "`", "+", "="]);
        return punctuationMarks.has(this.word['word']);
    }

    getAnnotation () {
        if (this.isPunctuation ())
            return '';
        let annotation = [];
        for (let pattr of this.toShow)
            if (pattr !== 'word')
                annotation.push (this.word[pattr]);

        return annotation.join (' : ');
    }

    toggleDisplay () {
        if (this.place === 'tooltip')
            this.place = 'inline';
        else
            this.place = 'tooltip';
    }

}
