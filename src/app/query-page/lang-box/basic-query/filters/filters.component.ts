import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { ConfigService } from 'src/app/config.service';
import { Option } from '../../../../dataTypes.d';

@Component({
    selector: 'spoco-filters',
    templateUrl: './filters.component.html',
    styleUrls: ['./filters.component.scss'],
    encapsulation: ViewEncapsulation.None   // allows to change style of ng-multiselect-dropdown
})
export class FiltersComponent implements OnInit {

    constructor(private configService: ConfigService) { }

    ngOnInit(): void {
        this.groups = this.configService.fetch ('filters');
        this.active_group = 0;
        let formGroups: { [key: string]: FormGroup } = {};
        for (let group of this.groups) {
            this.filtersOptions[group.name] = {};
            let controls: { [key: string]: FormControl } = {};
            for (let field of group.fields) {
                controls[field.name] = new FormControl ();
                this.filtersOptions[group.name][field.name] = field.options;
            }
            formGroups[group.name] = new FormGroup (controls);
        }
        this.filtersForm = new FormGroup (formGroups);
    }

    groups: {name: string, fields: [{name: string, options: Option[]}]}[];
    filtersOptions: {[key: string]: {[key: string]: Option[]}} = {};
    filtersForm: FormGroup;
    active_group: number;
    multiselectSettings: IDropdownSettings = {
        singleSelection: false,
        idField: 'value',
        textField: 'label',
        itemsShowLimit: 2,
        allowSearchFilter: false,
        enableCheckAll: true
      };

    chooseActive (name: string) {
        for (let group_ind = 0; group_ind < this.groups.length; ++group_ind)
        if (this.groups[group_ind]['name'] === name) {
            this.active_group = group_ind;
            break;
        }
    }

}
