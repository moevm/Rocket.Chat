import type { IRoom, IMessage } from '@rocket.chat/core-typings';
import { isTruthy } from '@rocket.chat/tools';
import { GenericMenu, type GenericMenuItemProps } from '@rocket.chat/ui-client';
import { MessageComposerAction, MessageComposerActionsDivider } from '@rocket.chat/ui-composer';
import { useLayoutHiddenActions, useUserId, usePermission, useUserSubscription, useMethod } from '@rocket.chat/ui-contexts';
import { useQuery } from '@tanstack/react-query';
import type { MouseEvent } from 'react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAudioMessageAction } from './hooks/useAudioMessageAction';
import { useCreateDiscussionAction } from './hooks/useCreateDiscussionAction';
import { useFileUploadAction } from './hooks/useFileUploadAction';
import { useMessageboxAppsActionButtons } from './hooks/useMessageboxAppsActionButtons';
import { useShareLocationAction } from './hooks/useShareLocationAction';
import { useTimestampAction } from './hooks/useTimestampAction';
import { useVideoMessageAction } from './hooks/useVideoMessageAction';
import { useWebdavActions } from './hooks/useWebdavActions';
import { messageBox } from '../../../../../lib/messageBox';
import { useChat } from '../../../contexts/ChatContext';
import { useRoom } from '../../../contexts/RoomContext';

export type MessageBoxActionsToolbarProps = {
	canSend: boolean;
	isMicrophoneDenied: boolean;
	variant: 'small' | 'large';
	isRecording: boolean;
	rid: IRoom['_id'];
	tmid?: IMessage['_id'];
	isImportantActive?: boolean;
	onImportantToggle?: (active: boolean) => void;
	isEditing: boolean;
};

const isHidden = (hiddenActions: Array<string>, action: GenericMenuItemProps) => {
	if (!action) {
		return true;
	}
	return hiddenActions.includes(action.id);
};

const MessageBoxActionsToolbar = ({
	canSend,
	isRecording,
	rid,
	tmid,
	variant = 'large',
	isMicrophoneDenied,
	isImportantActive = false,
	onImportantToggle,
	isEditing = false,
}: MessageBoxActionsToolbarProps) => {
	const { t } = useTranslation();
	const chatContext = useChat();

	if (!chatContext) {
		throw new Error('useChat must be used within a ChatProvider');
	}

	const room = useRoom();
	const userId = useUserId();
	const subscription = useUserSubscription(rid);
	const getUserRoomRole = useMethod('getUserRoomRole');

	const { data: hasRoleFromQuery = false } = useQuery({
		queryKey: ['user-room-role-toolbar', userId, rid, 'important-message-marker'],
		queryFn: async () => {
			if (!userId) return false;
			try {
				return await getUserRoomRole(rid, userId, 'important-message-marker');
			} catch (error) {
				return false;
			}
		},
		staleTime: 0,
		enabled: !!userId,
	});

	const hasPermission = usePermission('mark-message-as-important', rid);
	const hasRole = (subscription?.roles?.includes('important-message-marker') ?? false) || hasRoleFromQuery;
	const canMarkMessagesAsImportant = hasPermission || hasRole;

	const disableBasicActions = !canSend || isRecording || isEditing;

	const audioMessageAction = useAudioMessageAction(disableBasicActions || isMicrophoneDenied, isMicrophoneDenied);
	const videoMessageAction = useVideoMessageAction(disableBasicActions);
	const fileUploadAction = useFileUploadAction(disableBasicActions);
	const webdavActions = useWebdavActions(disableBasicActions);
	const createDiscussionAction = useCreateDiscussionAction(disableBasicActions, room);
	const shareLocationAction = useShareLocationAction(disableBasicActions, room, tmid);
	const timestampAction = useTimestampAction(!canSend || isRecording, chatContext.composer);

	const apps = useMessageboxAppsActionButtons();
	const { composerToolbox: hiddenActions } = useLayoutHiddenActions();

	const allActions = {
		...(!isHidden(hiddenActions, audioMessageAction) && { audioMessageAction }),
		...(!isHidden(hiddenActions, videoMessageAction) && { videoMessageAction }),
		...(!isHidden(hiddenActions, fileUploadAction) && { fileUploadAction }),
		...(!isHidden(hiddenActions, createDiscussionAction) && { createDiscussionAction }),
		...(!isHidden(hiddenActions, shareLocationAction) && { shareLocationAction }),
		...(timestampAction && !isHidden(hiddenActions, timestampAction) && { timestampAction }),
		...(!hiddenActions.includes('webdav-add') && webdavActions && { webdavActions }),
	};

	const featured = [];
	const createNew = [];
	const share = [];
	const insert = [];

	createNew.push(allActions.createDiscussionAction);

	if (allActions.timestampAction) {
		insert.push(allActions.timestampAction);
	}

	if (variant === 'small') {
		featured.push(allActions.audioMessageAction, allActions.fileUploadAction);
		createNew.push(allActions.videoMessageAction);
	} else {
		featured.push(allActions.audioMessageAction, allActions.videoMessageAction, allActions.fileUploadAction);
	}

	if (allActions.webdavActions) {
		createNew.push(...allActions.webdavActions);
	}

	share.push(allActions.shareLocationAction);

	const groups = {
		...(apps.isSuccess &&
			apps.data.length > 0 && {
				Apps: apps.data,
			}),
		...messageBox.actions.get(),
	};
	const messageBoxActions = Object.entries(groups).map(([name, group]) => {
		const items: GenericMenuItemProps[] = group
			.filter((item) => !hiddenActions.includes(item.id))
			.map((item) => ({
				id: item.id,
				icon: item.icon,
				content: t(item.label),
				onClick: (event?: MouseEvent<HTMLElement>) =>
					item.action({
						rid,
						tmid,
						event: event as unknown as Event,
						chat: chatContext,
					}),
				gap: Boolean(!item.icon),
				disabled: disableBasicActions,
			}));

		return {
			title: t(name),
			items: items || [],
		};
	});

	const createNewFiltered = createNew.filter(isTruthy);
	const shareFiltered = share.filter(isTruthy);
	const insertFiltered = insert.filter(isTruthy);

	const renderAction = ({ id, icon, content, disabled, onClick }: GenericMenuItemProps) => {
		if (!icon) {
			return;
		}

		return <MessageComposerAction key={id} icon={icon} data-qa-id={id} title={content as string} disabled={disabled} onClick={onClick} />;
	};

	return (
		<>
			<MessageComposerActionsDivider />
			{featured.map((action) => action && renderAction(action))}
			{canMarkMessagesAsImportant && (
				<MessageComposerAction
					icon='check'
					data-qa-id='important-message'
					title={t('Mark_as_important')}
					disabled={isRecording || !canSend || isEditing}
					onClick={() => onImportantToggle?.(!isImportantActive)}
					pressed={isImportantActive}
				/>
			)}
			<GenericMenu
				disabled={isRecording || !canSend}
				data-qa-id='menu-more-actions'
				detached
				icon='plus'
				sections={[
					{ title: t('Create_new'), items: createNewFiltered },
					{ title: t('Share'), items: shareFiltered },
					...(insertFiltered.length > 0 ? [{ title: t('Insert'), items: insertFiltered }] : []),
					...messageBoxActions,
				]}
				title={t('More_actions')}
			/>
		</>
	);
};

export default memo(MessageBoxActionsToolbar);
