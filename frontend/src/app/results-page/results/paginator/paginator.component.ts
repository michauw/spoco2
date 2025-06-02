import { Component, Input, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { ConfigService } from 'src/app/config.service';

@Component({
    selector: 'spoco-paginator',
    templateUrl: './paginator.component.html',
    styleUrls: ['./paginator.component.scss'],
    standalone: false
})
export class PaginatorComponent implements OnInit {

    constructor(private config: ConfigService) { }

    ngOnInit(): void {
        this.lastPage = Math.ceil (this.resLen / this.perPage);
        this.getPageRange (this.currentPage);
    }

    @Input() resLen: number;
    @Input() perPage: number;
    @Output() pageChanged = new EventEmitter<number>();
    currentPage: number = 1;
    lastPage: number;
    jumpTo: number = 0;
    pageRange: number[];
    @ViewChild('jumpToPage') jumpToField: ElementRef;

    jumpFieldUpdateValue (value: string) {
        if (Number.isNaN(value)) { 
            this.jumpTo = 0;
            return;
        }
        this.jumpTo = parseInt (value);
        // if ($event.key === 'Enter') {
        //     if (this.jumpTo >= 1 && this.jumpTo <= this.lastPage)
        //         this.changePage (this.jumpTo);
        // }
        // else {
        //     this.jumpTo = value;
        // }
    }

    pageInRange (page: number) {
        return (page >= 1 &&  page <= this.lastPage);
    }

    changePage (pageNumber: number) {
        if (this.pageInRange (pageNumber)) {
            this.currentPage = pageNumber;
            this.pageChanged.emit (pageNumber);
            this.jumpToField.nativeElement.value = '';
            this.getPageRange (pageNumber);
        }
    }

    getPageRange (page: number) {
        let array = [];
        let window = 4;
        this.lastPage = Math.ceil (this.resLen / this.perPage);  // TODO: probably it should be done within subscription to perPage value 
        for (let i = Math.max (1, page - window); i <= Math.min (this.lastPage, page + window); ++i) 
            array.push (i);

        this.pageRange = array;
    }

    getWidth () {
        let width = 2.5;
        if (this.jumpTo)
            width = Math.max (1.2 + this.jumpTo.toString().length * .55, width);
        return {width: width + 'rem'};
    }
}
