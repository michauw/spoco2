import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";
import { ConfigObj } from "./dataTypes";

@Injectable({
    providedIn: 'root'
})
export class ConfigResolver implements Resolve<ConfigObj> {

    constructor (private http: HttpClient) {}

    resolve (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ConfigObj> | ConfigObj {
        return this.http.get<ConfigObj> ('/settings/config.json');
    }
}