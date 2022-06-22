import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'spoco-lang-box',
  templateUrl: './lang-box.component.html',
  styleUrls: ['./lang-box.component.scss']
})
export class LangBoxComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    this.queryRowNumber = 1;
  }

  queryRowNumber: number = 0;

  qrRange () {
    return Array (this.queryRowNumber).fill (0).map ((x, i) => i);
  }

  addQueryRow () {
    this.queryRowNumber += 1;
  }

  deleteQueryRow () {
    this.queryRowNumber -= 1;
  }

}
