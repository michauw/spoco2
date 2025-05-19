import { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, Component, OnInit } from '@angular/core';
import { faC, faClose } from '@fortawesome/free-solid-svg-icons';
import { ActivatedRoute, Params } from '@angular/router';
import { ConfigService } from '../config.service';

export type modules = 'concordance' | 'collocations' | 'frequency';

@Component({
    selector: 'spoco-results-page',
    templateUrl: './results-page.component.html',
    styleUrls: ['./results-page.component.scss']
})
export class ResultsPageComponent implements OnInit, AfterViewInit {

    tabs: {name: string, number_of_results: number, module: modules, query: string, error: string, results_fetched: boolean}[] = [];
    tab_module_names: {[key: string]: string} = {concordance: 'concordance', collocations: 'collocations', frequency: 'frequency list'}
    current_tab: number = 0;
    close = {'icon': faClose};
    
    constructor(private route: ActivatedRoute, private config: ConfigService) { }

    ngOnInit(): void {
        this.route.params.subscribe ((params: Params) => {
            const module = params['module'];
            this.add_tab (module);
        });
        // this.header_visibility (this.header_visible);
    }

    ngAfterViewInit(): void {
        this.header_visibility ();
    }


    get_tab_name (index: number) {
        let name = this.tabs[index].name;
        name = name.charAt (0).toUpperCase () + name.substring (1).toLowerCase();
        return `(${index + 1}) ${name}`;
    }

    add_tab (module: modules) {
        this.tabs.push ({name: this.tab_module_names[module], number_of_results: -1, module: module, query: '...', error: '', results_fetched: false});
        this.current_tab = this.tabs.length - 1;
        this.header_visibility ();
    }

    get_collocation_columns () {
        const ams: string[] = this.config.fetch ('collocations_settings').ams;
        const names = {'pmi': 'PMI', 't_score': 'T-score', 'log_likelihood_ratio': 'LLR', 'dice': 'Dice', 'chi_square': 'Chi-square'};
        const am_columns = ams.map ((am) => ({name: names[am as keyof typeof names], format: '1.2-2'}));
        return [{name: 'Collocate', format: ''}].concat (am_columns).concat ([{name: 'Frequency', format: '1.0-0'}]);
    }

    results_fetched (results_data: {query: string, number_of_results: number}, index: number) {
        this.tabs[index].results_fetched = true;
        this.tabs[index].number_of_results = results_data.number_of_results;
        this.tabs[index].query = results_data.query;
        this.header_visibility ();
    }

    tabChanged (event: any) {
        this.current_tab = event.index;
    }

    update_tab_results (res_number: number) {
        this.tabs[this.current_tab].number_of_results = res_number;
    }

    private header_visibility () {
        let header = document.getElementsByTagName ('mat-tab-header')[0] as HTMLElement;
        if (header !== undefined) {
            this.tabs.length > 1 ? header.style.display = 'flex' : header.style.display = 'none';
        }
    }
}
