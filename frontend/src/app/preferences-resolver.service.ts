import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";
import { PreferencesObj } from "./dataTypes";
import { BASE_URL } from "src/environments/environment";

@Injectable({
    providedIn: 'root'
})
export class PreferencesResolver  {

    constructor (private http: HttpClient) {}

    resolve (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<PreferencesObj> | PreferencesObj {
        return this.http.get<PreferencesObj> (`${BASE_URL}/preferences`);
    }
}