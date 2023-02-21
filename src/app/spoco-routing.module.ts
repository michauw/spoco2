import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QueryPageComponent } from './query-page/query-page.component';
import { ConfigResolver } from './config-resolver.service';
import { ResultsComponent } from './results/results.component';
import { ConfigCreatorComponent } from './config-creator/config-creator.component';

const routes: Routes = [
    {path: '', component: QueryPageComponent, resolve: {config: ConfigResolver}},
    {path: 'results', component: ResultsComponent, resolve: {config: ConfigResolver}},
    {path: 'config', component: ConfigCreatorComponent}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class SpocoRoutingModule { }
