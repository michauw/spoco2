import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IDropdownSettings } from 'ng-multiselect-dropdown';

  @Component({
    selector: 'spoco-select',
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss']
})
export class SelectComponent implements OnInit {

    constructor() { }

    ngOnInit(): void {
    }

    @Input() form: FormGroup;
    @Input() name: string;
    @Input() group: string;
    @Input() data: any;
    multiSettings: IDropdownSettings = {
        singleSelection: false,
        idField: 'value',
        textField: 'label',
        itemsShowLimit: 2,
        allowSearchFilter: false,
        enableCheckAll: false
      };

}
