import { Component, OnInit } from '@angular/core';
import { QueryKeeperService } from '../query-keeper.service';

@Component({
  selector: 'spoco-lang-box',
  templateUrl: './lang-box.component.html',
  styleUrls: ['./lang-box.component.scss']
})
export class LangBoxComponent implements OnInit {

  constructor(private queryKeeper: QueryKeeperService) { }

  ngOnInit(): void {
    this.queryRowNumber = 1;
  }

  clear () {
    this.queryKeeper.clear ();
  }

  qrRange () {
    return Array (this.queryRowNumber).fill (0).map ((x, i) => i);
  }

  moreRows () {
    this.queryRowNumber += 1;
  }

  lessRows () {
    this.queryRowNumber -= 1;
    this.queryKeeper.pop ();
  }

  queryRowNumber: number = 0;

}
