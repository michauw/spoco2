import { Component, OnInit } from '@angular/core';
import { ActionService } from 'src/app/action.service';
import { CorporaKeeperService } from 'src/app/corpora-keeper.service';
import { ConcordanceMonoComponent } from '../concordance-mono/concordance-mono.component';
import { faArrowAltCircleLeft, faArrowAltCircleRight } from '@fortawesome/free-solid-svg-icons';

type Direction = 'left' | 'right';
@Component({
    selector: 'spoco-concordance-parallel',
    templateUrl: './concordance-parallel.component.html',
    styleUrls: ['./concordance-parallel.component.scss']
})
export class ConcordanceParallelComponent extends ConcordanceMonoComponent {

    locked: number[] = [0];
    max_visible = 3;
    visible_columns = this.get_visible_columns ();
    arrow_left = faArrowAltCircleLeft;
    arrow_right = faArrowAltCircleRight;

    constructor(actions: ActionService, corporaKeeper: CorporaKeeperService) { 
        super (actions, corporaKeeper);
    }

    control_locked (index: number) {
        const found = this.locked.indexOf (index);
        if (found === -1) {
            this.locked.push (index);
            this.locked.sort ();
        }
        else {
            this.locked.splice (found, 1);
        }
        console.log ('locked:', this.locked);
    }

    get_column_width () {
        const val = (100 - 8) / this.max_visible;
        return `${val}%`;
    }

    get_visible_columns () {
        let visible = this.locked.slice ();
        const usedIndexes = new Set (visible);
        for (let i = 0; visible.length < this.max_visible; ++i)
            if (!usedIndexes.has (i))
                visible.push (i);
        return visible;
    }

    shift_possible (direction: Direction) {
        console.log ('dir:', direction);
        if (this.locked.length === this.max_visible)
            return false;
        const not_locked = this.visible_columns.filter (el => !this.locked.includes (el));
        const start = direction === 'left' ? 0 : not_locked[not_locked.length - 1] + 1;
        const end = direction === 'left' ? not_locked[0] : this.corpora.length;
        for (let i = start; i < end; ++i)
            if (!this.locked.includes (i))
                return true;
        return false;
    }

    shift (direction: Direction) {
        let available = [];
        const start = direction === 'left' ? Math.max (0, this.visible_columns[0] - this.max_visible) : this.visible_columns[0];
        const end = direction === 'left' ? this.visible_columns[this.visible_columns.length - 1] : Math.min (this.visible_columns[this.visible_columns.length - 1] + this.max_visible, this.corpora.length - 1);
        for (let i = start; i <= end; ++i)
            if (!this.locked.includes (i))
                available.push (i);
        for (let i = 0; i < this.visible_columns.length; ++i) {
            if (!this.locked.includes (this.visible_columns[i])) {
                const place = available.indexOf (this.visible_columns[i]);
                this.visible_columns[i] = available[place + (direction === 'left' ? -1 : 1)];
            }
        }
        this.visible_columns.sort ();
    }


}
