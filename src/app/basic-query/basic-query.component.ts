import { Component, OnInit } from '@angular/core';
import { QueryKeeperService } from '../query-keeper.service';

@Component({
  selector: 'spoco-basic-query',
  templateUrl: './basic-query.component.html',
  styleUrls: ['./basic-query.component.scss']
})
export class BasicQueryComponent implements OnInit {

  constructor(private queryKeeper: QueryKeeperService) { }

  ngOnInit(): void {
      this.queryRowNumber = 1;
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
