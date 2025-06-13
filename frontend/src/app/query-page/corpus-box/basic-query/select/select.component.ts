import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { IDropdownSettings } from 'ng-multiselect-dropdown';

  @Component({
    selector: 'spoco-select',
    templateUrl: './select.component.html',
    styleUrls: ['./select.component.scss'],
    standalone: false
})
export class SelectComponent implements OnInit {

    @Input() form: UntypedFormGroup;
    @Input() name: string;
    @Input() group: string;
    @Input() data: any;
    @Input() disabled: boolean;

    multiSettings: IDropdownSettings = {
        singleSelection: false,
        idField: 'value',
        textField: 'label',
        itemsShowLimit: 2,
        allowSearchFilter: false,
        enableCheckAll: false
      };

    constructor() { }

    ngOnInit(): void {
        if (this.disabled)
            this.form.disable ();
    }


}
