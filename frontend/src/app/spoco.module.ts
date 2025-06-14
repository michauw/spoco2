import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';

import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';


import { SpocoRoutingModule } from './spoco-routing.module';
import { SpocoComponent } from './spoco.component';
import { QueryPageComponent } from './query-page/query-page.component';
import { CorpusBoxComponent } from './query-page/corpus-box/corpus-box.component';
import { CqpQueryComponent } from './query-page/corpus-box/cqp-query/cqp-query.component';
import { BasicQueryComponent } from './query-page/corpus-box/basic-query/basic-query.component';
import { QueryRowComponent } from './query-page/corpus-box/basic-query/query-row/query-row.component';
import { ConfigResolver } from './config-resolver.service';
import { FiltersComponent } from './query-page/corpus-box/basic-query/filters/filters.component';
import { SelectComponent } from './query-page/corpus-box/basic-query/select/select.component';
import { CorporaRibbonComponent } from './query-page/corpus-box/corpora-ribbon/corpora-ribbon.component';
import { ResultsPageComponent } from './results-page/results-page.component';
import { InfoBoxComponent } from './results-page/results/info-box/info-box.component';
import { ActionBoxComponent } from './results-page/results/info-box/action-box/action-box.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ConcordanceComponent } from './results-page/results/concordance/concordance.component';
import { ConcordanceRowComponent } from './results-page/results/concordance/concordance-row/concordance-row.component';
import { AnnotatedWordComponent } from './results-page/results/concordance/concordance-row/annotated-word/annotated-word.component';
import { ResultsTableComponent } from './results-page/results/results-table/results-table.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MetaShowComponent } from './results-page/results/meta-show/meta-show.component';
import { HeaderComponent } from './header/header.component';
import { ConfigCreatorComponent } from './config-creator/config-creator.component';
import { PaginatorComponent } from './results-page/results/paginator/paginator.component';
import { PreferencesResolver } from './preferences-resolver.service';
import { SettingsBoxComponent } from './shared/ui/settings-box/settings-box.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CorpusDataResolver } from './corpus-data-resolver.service';
import { MatFormField } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { IconMultiselectComponent } from './icon-multiselect/icon-multiselect.component';
import { SharedModule } from './shared/shared.module';
import { WarningDialogComponent } from './query-page/corpus-box/basic-query/query-row/warning-dialog/warning-dialog.component';

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
        ConcordanceComponent,
        ConcordanceRowComponent,
        AnnotatedWordComponent,
        InfoBoxComponent,
        ActionBoxComponent,
        MetaShowComponent,
        HeaderComponent,
        ConfigCreatorComponent,
        PaginatorComponent,
        ResultsTableComponent,
        WarningDialogComponent,
    ],
    bootstrap: [SpocoComponent], 
    imports: [
        IconMultiselectComponent,
        SharedModule,
        BrowserModule,
        SpocoRoutingModule,
        ReactiveFormsModule,
        NgMultiSelectDropDownModule.forRoot(),
        FontAwesomeModule,
        BrowserAnimationsModule,
        MatButtonModule,
        MatTooltipModule,
        MatDialogModule,
        MatCheckboxModule,
        MatFormField,
        MatSelectModule,
        MatTabsModule,
        SettingsBoxComponent
    ], 
    providers: [
        ConfigResolver, 
        PreferencesResolver, 
        CorpusDataResolver, 
        provideHttpClient(withFetch()), 
        provideHttpClient(withInterceptorsFromDi())
    ] 
})
export class SpocoModule { }
