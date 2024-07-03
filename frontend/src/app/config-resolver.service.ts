import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";
import { ConfigObj } from "./dataTypes";
import { CONFIG_FILE } from "src/environments/environment";

@Injectable({
    providedIn: 'root'
})
export class ConfigResolver  {

    constructor (private http: HttpClient) {}

    resolve (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ConfigObj> | ConfigObj {
        return this.http.get<ConfigObj> (`settings/${CONFIG_FILE}`);
    }
}