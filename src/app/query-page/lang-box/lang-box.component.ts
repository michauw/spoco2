import { Component, OnInit, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QueryKeeperService } from '../../query-keeper.service';

@Component({
  selector: 'spoco-lang-box',
  templateUrl: './lang-box.component.html',
  styleUrls: ['./lang-box.component.scss']
})

@Injectable()
export class LangBoxComponent implements OnInit {

  constructor(private http: HttpClient, private queryKeeper: QueryKeeperService) { }

  ngOnInit(): void {
  }

  clear () {
    this.queryKeeper.clear ();
  }

  search () {
    this.http.post ('http://localhost:8000/results', {query: this.queryKeeper.getQuery ()}).subscribe (responseData => {
      console.log ('results:\n', responseData);
    });
  }
}
