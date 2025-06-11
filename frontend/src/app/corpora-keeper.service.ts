import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Corpus } from './dataTypes';

@Injectable({
    providedIn: 'root'
})
export class CorporaKeeperService {

    constructor() { }

    corpora: Corpus[];
    chosenCorpora: string[] = [];
    primary: Corpus;
    current: Corpus;
    currentChange: Subject<Corpus> = new Subject<Corpus> ();
    corporaChange: Subject<Corpus[]> = new Subject<Corpus[]> ();
    primaryChange: Subject<Corpus> = new Subject<Corpus> ();

    findCorpusPosition (corpus: Corpus) {
        let pos: number = 0;
        for (let i = 0; i < this.corpora.length; ++i)
          if (this.corpora[i].id === corpus.id) {
            pos = i;
            break;
          }
    
        return pos;
      }

    moveCorpus (direction: string, corpus: Corpus) {
        let position: number = this.findCorpusPosition (corpus);
        this.corpora.splice(0, 0, )
        if (direction === 'down')
            position += 1;
        if ((direction === 'up' && position <= 1) || (direction === 'down' && position >= this.corpora.length))
            return 0;
        this.corpora.splice (position - 1, 0, this.corpora.splice (position, 1)[0]);
        this.corporaChange.next (this.corpora);

        return position;
    }

    getCurrent () {
        return this.current;
    }

    getCorpora (only_chosen: boolean = false) {
        if (only_chosen)
            return this.corpora.filter (c => this.chosenCorpora.includes (c.id))
        return this.corpora;
    }

    getCorporaNumber (only_chosen: boolean = false) {
        return only_chosen ? this.chosenCorpora.length : this.corpora.length;
    }

    getPrimary () {
        return this.corpora[0];
    }

    getSecondary () {
        return this.corpora.slice (1);
    }

    setChosenCorpora (corpora: Corpus[]) {
        this.chosenCorpora = corpora.map (c => c.id);
        this.corpora.filter (c => this.chosenCorpora.includes (c.id))
        this.chosenCorpora.filter (s => s === 'id')
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
        corpus.primary = true;
        this.corpora.splice (pos, 1);
        this.corpora = [corpus].concat (this.corpora);
        for (let i = 1; i < this.corpora.length; ++i)
            this.corpora[i].primary = false;
        this.corporaChange.next (this.corpora);
        this.primaryChange.next (corpus);
    }
  }
