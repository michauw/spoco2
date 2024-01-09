import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";
import { PreferencesObj } from "./dataTypes";

@Injectable({
    providedIn: 'root'
})
export class PreferencesResolver implements Resolve<PreferencesObj> {

    constructor (private http: HttpClient) {}

    resolve (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<PreferencesObj> | PreferencesObj {
        return this.http.get<PreferencesObj> ('/settings/preferences.json');
    }
}