import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { QueryKeeperService } from '../query-keeper.service';

@Component({
  selector: 'spoco-cqp-query',
  templateUrl: './cqp-query.component.html',
  styleUrls: ['./cqp-query.component.scss']
})
export class CqpQueryComponent implements OnInit {

  constructor(private queryKeeper: QueryKeeperService) { }

  ngOnInit(): void {
      this.queryKeeper.valueChanged.subscribe (data => {
          const cqpObj = this.queryKeeper.getQuery ();
          let cqpVal: string = '';
          let elements: string[] = [];
          for (let prop in cqpObj) {
            if (prop === 'modifiers')
              continue;
            let val = cqpObj[prop as keyof typeof cqpObj];
            if (val)
              elements.push (`${prop}="${val}"`);
          }
          cqpVal = elements.join (' & ');
          this.cqpQueryForm.setValue ({cqp: cqpVal});
      });
  }

  cqpQueryForm: FormGroup = new FormGroup ({
      'cqp': new FormControl (null)
  });

}
