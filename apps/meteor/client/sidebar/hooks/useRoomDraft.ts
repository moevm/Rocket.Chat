import type { ISubscription } from '@rocket.chat/core-typings';
import { useSyncExternalStore } from 'react';

import { getMessageBoxStorageKey } from '../../lib/utils/getMessageBoxStorageKey';
import { getSubscriptionDraft } from '../../lib/utils/getSubscriptionDraft';

type RoomDraftSource = Pick<ISubscription, 'rid' | 'draft' | 'threadDrafts'>;

const draftChangeListeners = new Set<() => void>();
let listening = false;

const notifyDraftListeners = (): void => {
	draftChangeListeners.forEach((listener) => listener());
};

const ensureDraftListeners = (): void => {
	if (listening) {
		return;
	}

	listening = true;

	const handleStorageChange = (e: StorageEvent | Event): void => {
		if (e instanceof StorageEvent) {
			if (e.key !== null && !e.key.startsWith('messagebox_')) {
				return;
			}
			notifyDraftListeners();
			return;
		}

		if ('detail' in e) {
			const key = (e as CustomEvent<{ key?: string | null }>).detail?.key;
			if (key === null || key === undefined || key.startsWith('messagebox_')) {
				notifyDraftListeners();
			}
		}
	};

	window.addEventListener('storage', handleStorageChange);
	window.addEventListener('localStorageChange', handleStorageChange);
};

const subscribeToDraftChanges = (callback: () => void): (() => void) => {
	ensureDraftListeners();
	draftChangeListeners.add(callback);

	return () => {
		draftChangeListeners.delete(callback);
	};
};

const hasLocalDraftForRoom = (roomId: string): boolean => {
	const roomKey = getMessageBoxStorageKey(roomId);
	const threadKeyPrefix = `${roomKey}-`;

	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (!key || (key !== roomKey && !key.startsWith(threadKeyPrefix))) {
			continue;
		}

		const draft = localStorage.getItem(key);
		if (draft?.trim()) {
			return true;
		}
	}

	return false;
};

export const useRoomDraft = (room: RoomDraftSource): boolean => {
	const hasLocalDraft = useSyncExternalStore(subscribeToDraftChanges, () => hasLocalDraftForRoom(room.rid));

	return hasLocalDraft || Boolean(getSubscriptionDraft(room));
};
