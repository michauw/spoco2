import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Corpus } from './dataTypes';

@Injectable({
    providedIn: 'root'
})
export class CorporaKeeperService {

    constructor() { }

    corpora: Corpus[];
    primary: Corpus;
    current: Corpus;
    currentChange: Subject<Corpus> = new Subject<Corpus> ();
    corporaChange: Subject<Corpus[]> = new Subject<Corpus[]> ();
    primaryChange: Subject<Corpus> = new Subject<Corpus> ();

    findCorpusPosition (corpus: Corpus) {
        let pos: number = 0;
        for (let i = 0; i < this.corpora.length; ++i)
          if (this.corpora[i] === corpus) {
            pos = i;
            break;
          }
    
        return pos;
      }

    moveCorpus (direction: string) {
        let position: number = this.findCorpusPosition (this.current);
        if (direction === 'down')
            position += 1;
        if ((direction === 'up' && position <= 1) || (direction === 'down' && position >= this.corpora.length - 1))
            return 0;
        this.corpora.splice (position - 1, 0, this.corpora.splice (position, 1)[0]);
        this.corporaChange.next (this.corpora);

        return position;
    }

    getCurrent () {
        return this.current;
    }

    getCorpora () {
        return this.corpora;
    }

    getPrimary () {
        return this.corpora[0];
    }

    getSecondary () {
        return this.corpora.slice (1);
    }

    setCurrent (corpus: Corpus) {
        this.current = corpus;
        this.currentChange.next (corpus);
    }

    setCorpora (corpora: Corpus[]): Corpus[] {
        let primary = corpora[0];
        for (let i = 0; i < corpora.length; ++i) {
            if (corpora[i].primary) {
                primary = corpora.splice (i, i + 1)[0];
                break;
            }
        }
        this.corpora = [primary].concat (corpora);
        this.corporaChange.next (this.corpora);
        this.current = primary;

        return this.corpora;
    }

    setPrimary (corpus: Corpus) {
        let pos: number = this.findCorpusPosition (corpus);
        this.corpora.splice (pos, 1);
        this.corpora = [corpus].concat (this.corpora);
        this.corporaChange.next (this.corpora);
        this.primaryChange.next (corpus);
    }
  }
