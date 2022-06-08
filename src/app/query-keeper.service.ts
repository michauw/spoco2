import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QueryKeeperService {

  constructor() { }

  queryRows: Object[] = [];
  valueChanged = new Subject<boolean> ();

  getQuery () {
      return this.queryRows[0];
  }

  setValue (data: Object) {
      if (!this.queryRows.length)
        this.queryRows.push (data);
      else
        this.queryRows[0] = data;
      this.valueChanged.next (true);
  }

}
