import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

export type modules = 'concordance' | 'collocations' | 'frequency';

@Component({
    selector: 'spoco-results-page',
    templateUrl: './results-page.component.html',
    styleUrls: ['./results-page.component.scss']
})
export class ResultsPageComponent implements OnInit {

    tabs: {name: string, number_of_results: number, module: modules, query: string}[] = [];
    tab_module_names: {[key: string]: string} = {concordance: 'konkordancja', collocations: 'kolokacje', frequency: 'lista frekwencyjna'}
    current_tab: number = 0;
    header_visible = false;

    constructor(private route: ActivatedRoute) { }

    ngOnInit(): void {
        this.route.params.subscribe ((params: Params) => {
            const module = params['module'];
            this.add_tab (module);
        });
        this.header_visibility (this.header_visible);
    }

    get_tab_name (index: number) {
        let name = this.tabs[index].name;
        name = name.charAt (0).toUpperCase () + name.substring (1).toLowerCase();
        return `(${index + 1}) ${name}`;
    }

    add_tab (module: modules) {
        this.tabs.push ({name: this.tab_module_names[module], number_of_results: -1, module: module, query: '...'});
        this.current_tab = this.tabs.length - 1;
        this.header_visibility (true);
    }

    results_fetched (results_data: {query: string, number_of_results: number}, index: number) {
        this.tabs[index].number_of_results = results_data.number_of_results;
        this.tabs[index].query = results_data.query;
    }

    tabChanged (event: any) {
        this.current_tab = event.index;
    }

    private header_visibility (show: boolean) {
        let header = document.getElementsByTagName ('mat-tab-header')[0] as HTMLElement;
        show ? header.style.display = 'flex' : header.style.display = 'none';
    }
}