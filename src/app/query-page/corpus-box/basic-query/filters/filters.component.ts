import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { Subscription } from 'rxjs';
import { ConfigService } from 'src/app/config.service';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { QueryKeeperService } from 'src/app/query-keeper.service';
import { Filters, Corpus, Option, PAttribute } from '../../../../dataTypes.d';

@Component({
    selector: 'spoco-filters',
    templateUrl: './filters.component.html',
    styleUrls: ['./filters.component.scss'],
    encapsulation: ViewEncapsulation.None   // allows to change style of ng-multiselect-dropdown
})
export class FiltersComponent implements OnInit, OnDestroy {

    constructor(private configService: ConfigService, private queryKeeper: QueryKeeperService, private corporaKeeper: CorporaKeeperService) { }

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
        this.currentCorpus = this.corporaKeeper.getCurrent ();

        this.filtersForm.valueChanges.subscribe(data => {
            let filters: Filters = {};
            for (let group in data) {
                for (let field in data[group]) {
                    let value = data[group][field];
                    if (value === null)
                        continue;
                    if (typeof value === 'number' || typeof value === 'string') {
                        filters[field] = `${value}`;
                    }
                    else if (value.constructor.name === 'Array') {
                        filters[field] = value.map ((elem:any) => { return elem.value}).join ('|');
                    }
                }
            }
            this.queryKeeper.setFilters (filters, this.currentCorpus.id);

        });
        this.currentCorpusChanged = this.corporaKeeper.currentChange.subscribe (corpus => this.currentCorpus = corpus);

    }

    ngOnDestroy(): void {
        this.currentCorpusChanged.unsubscribe ();
    }

    currentCorpus: Corpus;
    currentCorpusChanged: Subscription;
    groups: {name: string, fields: PAttribute[]}[];
    filtersOptions: {[key: string]: {[key: string]: Option[] | undefined}} = {};
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
