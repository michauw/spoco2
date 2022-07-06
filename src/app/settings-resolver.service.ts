import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";

type attrType = 'text' | 'checkbox' | 'select' | 'multiselect';    // supported types for positional attributes input fields

interface PAttribute {
    name: string,
    type: attrType,
    initValue: string | boolean,        // string for text types, boolean for checkboxes
    description: string,                // placeholders for text types and labels for checkboxex
    use?: boolean,                      // optional, as for now only ignoreDiacritics has use=false set by default
    valueTrue?: string,                 // only for checkboxes: map boolean true value to the corresponding string
    valueFalse?: string                 // as above, but for the false val
};

@Injectable({
    providedIn: 'root'
})
export class SettingsResolver implements Resolve<PAttribute> {


    constructor (private http: HttpClient) {}

    resolve (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<PAttribute> | PAttribute {
        return this.http.get<PAttribute> ('/settings/pattrs.json');
    }
}