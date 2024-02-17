import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QueryPageComponent } from './query-page/query-page.component';
import { ConfigResolver } from './config-resolver.service';
import { PreferencesResolver } from './preferences-resolver.service';
import { ConfigCreatorComponent } from './config-creator/config-creator.component';
import { ResultsPageComponent } from './results-page/results-page.component';
import { queryEmptyGuard } from './query-empty.guard';

const routes: Routes = [
    {path: '', component: QueryPageComponent, resolve: {config: ConfigResolver, preferences: PreferencesResolver }},
    {path: 'results/:module', component: ResultsPageComponent, resolve: {config: ConfigResolver }, canActivate: [queryEmptyGuard]},
    {path: 'config', component: ConfigCreatorComponent}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class SpocoRoutingModule { }
