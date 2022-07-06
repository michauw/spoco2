import { Component, OnInit } from '@angular/core';
import { QueryKeeperService } from '../../query-keeper.service';

@Component({
  selector: 'spoco-lang-box',
  templateUrl: './lang-box.component.html',
  styleUrls: ['./lang-box.component.scss']
})
export class LangBoxComponent implements OnInit {

  constructor(private queryKeeper: QueryKeeperService) { }

  ngOnInit(): void {
  }

  clear () {
    this.queryKeeper.clear ();
  }
}
