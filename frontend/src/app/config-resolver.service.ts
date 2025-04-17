import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";
import { ConfigObj } from "./dataTypes";
import { BASE_URL } from "src/environments/environment";

@Injectable({
    providedIn: 'root'
})
export class ConfigResolver  {

    constructor (private http: HttpClient) {}

    resolve (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<ConfigObj> | ConfigObj {
        return this.http.get<ConfigObj> (`${BASE_URL}/config`);
    }
}