import { CanActivateFn, Router } from '@angular/router';
import { QueryKeeperService } from './query-keeper.service';
import { inject } from '@angular/core';

export const queryEmptyGuard: CanActivateFn = (route, state) => {
    const queryKeeper = inject (QueryKeeperService);
    if (queryKeeper.queryEmpty ()) {
		const router = inject (Router);
		router.navigate (['/']);
		return false;
    }
	return true;
};
