import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';


import { SpocoRoutingModule } from './spoco-routing.module';
import { SpocoComponent } from './spoco.component';
import { QueryPageComponent } from './query-page/query-page.component';
import { CorpusBoxComponent } from './query-page/corpus-box/corpus-box.component';
import { CqpQueryComponent } from './query-page/corpus-box/cqp-query/cqp-query.component';
import { BasicQueryComponent } from './query-page/corpus-box/basic-query/basic-query.component';
import { QueryRowComponent } from './query-page/corpus-box/basic-query/query-row/query-row.component';
import { ConfigResolver } from './config-resolver.service';
import { CommonModule } from '@angular/common';
import { FiltersComponent } from './query-page/corpus-box/basic-query/filters/filters.component';
import { SelectComponent } from './query-page/corpus-box/basic-query/select/select.component';
import { CorporaRibbonComponent } from './query-page/corpus-box/corpora-ribbon/corpora-ribbon.component';
import { ResultsPageComponent } from './results-page/results-page.component';
import { ResultsComponent } from './results-page/results/results.component';
import { InfoBoxComponent } from './results-page/results/info-box/info-box.component';
import { ActionBoxComponent } from './results-page/results/info-box/action-box/action-box.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ConcordanceMonoComponent } from './results-page/results/concordance-mono/concordance-mono.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatTooltipModule} from '@angular/material/tooltip';
import { MetaShowComponent } from './results-page/results/meta-show/meta-show.component';
import { ConcordanceParallelComponent } from './results-page/results/concordance-parallel/concordance-parallel.component';
import { HeaderComponent } from './header/header.component';
import { ConfigCreatorComponent } from './config-creator/config-creator.component';
import { PaginatorComponent } from './results-page/results/paginator/paginator.component';
import { PreferencesResolver } from './preferences-resolver.service';
import { ConcordanceSpokenComponent } from './results-page/results/concordance-spoken/concordance-spoken.component';
import { MatDialogModule } from '@angular/material/dialog';
import { SettingsBoxComponent } from './query-page/settings-box/settings-box.component';
import {MatTabsModule} from '@angular/material/tabs';


@NgModule({
    declarations: [
        SpocoComponent,
        QueryRowComponent,
        CqpQueryComponent,
        CorpusBoxComponent,
        BasicQueryComponent,
        QueryPageComponent,
        FiltersComponent,
        SelectComponent,
        CorporaRibbonComponent,
        ResultsPageComponent,
        ResultsComponent,
        InfoBoxComponent,
        ActionBoxComponent,
        ConcordanceMonoComponent,
        MetaShowComponent,
        ConcordanceParallelComponent,
        HeaderComponent,
        ConfigCreatorComponent,
        PaginatorComponent,
        ConcordanceSpokenComponent,
        SettingsBoxComponent
  ],
    imports: [
        BrowserModule,
        SpocoRoutingModule,
        ReactiveFormsModule,
        HttpClientModule,
        NgMultiSelectDropDownModule.forRoot(),
        FontAwesomeModule,
        BrowserAnimationsModule,
        MatTooltipModule,
        MatDialogModule,
        MatTabsModule
  ],
  providers: [ConfigResolver, PreferencesResolver],
  bootstrap: [SpocoComponent]
})
export class SpocoModule { }
