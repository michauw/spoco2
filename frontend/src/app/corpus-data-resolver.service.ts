import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BASE_URL } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { CorporaInfo } from './dataTypes';

@Injectable({
    providedIn: 'root'
})
export class CorpusDataResolver {

    constructor (private http: HttpClient) { }

    resolve (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<CorporaInfo> | CorporaInfo {
          return this.http.get<CorporaInfo> (`${BASE_URL}/corpora`);
      }

}
