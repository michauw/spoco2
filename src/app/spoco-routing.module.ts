import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QueryPageComponent } from './query-page/query-page.component';
import { SettingsResolver } from './settings-resolver.service';

const routes: Routes = [
    {path: '', component: QueryPageComponent, resolve: {pattr: SettingsResolver}}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class SpocoRoutingModule { }
