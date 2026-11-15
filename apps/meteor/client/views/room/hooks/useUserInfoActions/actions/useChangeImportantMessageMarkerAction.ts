import type { IRoom, IUser } from '@rocket.chat/core-typings';
import { useStableCallback } from '@rocket.chat/fuselage-hooks';
import {
	usePermission,
	useUserRoom,
	useUserSubscription,
	useToastMessageDispatch,
	useUserId,
	useMethod,
	useStream,
	useTranslation,
} from '@rocket.chat/ui-contexts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';

import { getRoomDirectives } from '../../../lib/getRoomDirectives';
import type { UserInfoAction, UserInfoActionType } from '../useUserInfoActions';

export const useChangeImportantMessageMarkerAction = (
	user: Pick<IUser, '_id' | 'username' | 'name' | 'freeSwitchExtension' | 'roles'>,
	rid: IRoom['_id'],
): UserInfoAction | undefined => {
	const room = useUserRoom(rid);
	const { _id: uid, username } = user;
	const currentUserId = useUserId();
	const userSubscription = useUserSubscription(rid);
	
	const userCanSetImportantMessageMarker = usePermission('set-important-message-marker', rid);
	const dispatchToastMessage = useToastMessageDispatch();
	const getUserRoomRole = useMethod('getUserRoomRole');
	const t = useTranslation();
	const queryClient = useQueryClient();
	const subscribeToNotifyLogged = useStream('notify-logged');

	const roomCanSetImportantMessageMarker = room
		? getRoomDirectives({ room, showingUserId: uid, userSubscription }).roomCanSetImportantMessageMarker
		: false;

	useEffect(() => {
		const unsubscribe = subscribeToNotifyLogged('roles-change', (role) => {
			if (role.u?._id === uid && (role.scope === rid || !role.scope)) {
				queryClient.invalidateQueries({ 
					queryKey: ['user-room-role', uid, rid] 
				});
			}
		});
		
		return unsubscribe;
	}, [subscribeToNotifyLogged, uid, rid, queryClient]);
	
	const { data: isTargetOwner = false } = useQuery({
		queryKey: ['user-room-role', uid, rid, 'owner'],
		queryFn: async () => {
			try {
				return await getUserRoomRole(rid, uid, 'owner');
			} catch (error) {
				return false;
			}
		},
		staleTime: 0,
	});

	const isTargetPrivileged = isTargetOwner;

	const { data: hasRole = false, refetch } = useQuery({
		queryKey: ['user-room-role', uid, rid, 'important-message-marker'],
		queryFn: async () => {
			try {
				return await getUserRoomRole(rid, uid, 'important-message-marker');
			} catch (error) {
				return false;
			}
		},
		staleTime: 0,
	});

	const changeRoleAction = useStableCallback(async () => {
		try {
			const newRoleState = !hasRole;

			await Meteor.callAsync(
				newRoleState
					? 'addRoomImportantMessageMarker'
					: 'removeRoomImportantMessageMarker',
				rid,
				uid
			);

			await refetch();
			await queryClient.invalidateQueries({
				queryKey: ['user-room-role', uid, rid],
			});

			dispatchToastMessage({
				type: 'success',
				message: newRoleState
					? `${t('Set_as_important_message_marker')} to @${username} in this room`
					: `${t('Remove_as_important_message_marker')} from @${username} in this room`,
			});
		} catch (error) {
			dispatchToastMessage({
				type: 'error',
				message: error,
			});
		}
	});

	const changeRoleOption = useMemo(() => {
		if (!room) {
			return undefined;
		}

		if (uid === currentUserId) {
			return undefined;
		}

		if (!roomCanSetImportantMessageMarker) {
			return undefined;
		}

		if (!userCanSetImportantMessageMarker) {
			return undefined;
		}

		if (isTargetPrivileged) {
			return undefined;
		}

		return {
			content: t(hasRole ? 'Remove_as_important_message_marker' : 'Set_as_important_message_marker'),
			icon: 'flag' as const,
			onClick: changeRoleAction,
			type: 'privileges' as UserInfoActionType,
		};
	}, [
		room,
		hasRole,
		roomCanSetImportantMessageMarker,
		userCanSetImportantMessageMarker,
		isTargetPrivileged,
		changeRoleAction,
		uid,
		currentUserId,
		t,
	]);

	return changeRoleOption;
};
