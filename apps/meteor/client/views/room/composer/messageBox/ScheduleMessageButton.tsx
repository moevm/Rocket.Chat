import { MessageComposerAction } from '@rocket.chat/ui-composer';
import { useTranslation, useToastMessageDispatch, useSetModal } from '@rocket.chat/ui-contexts';
import { useCallback } from 'react';

import { useChat } from '../../contexts/ChatContext';
import { useRoom } from '../../contexts/RoomContext';
import ScheduleMessageModal from '../../modals/ScheduleMessageModal';
import ScheduledMessagesListModal from '../../modals/ScheduleMessageModal/ScheduledMessagesListModal';
import { useScheduleMessage } from '../hooks/useScheduleMessage';

type ScheduleMessageButtonProps = {
	disabled: boolean;
	tmid?: string;
	tshow?: boolean;
	previewUrls?: string[];
};

const ScheduleMessageButton = ({ disabled, tmid, tshow, previewUrls }: ScheduleMessageButtonProps) => {
	const t = useTranslation();
	const setModal = useSetModal();
	const room = useRoom();
	const chat = useChat();
	const dispatchToastMessage = useToastMessageDispatch();
	const scheduleMessageMutation = useScheduleMessage();

	const handleClick = useCallback(() => {
		const message = chat?.composer?.text ?? '';

		if (!message.trim()) {
			setModal(<ScheduledMessagesListModal roomId={room._id} onClose={() => setModal(null)} />);
			return;
		}

		setModal(
			<ScheduleMessageModal
				message={message}
				onClose={() => setModal(null)}
				onSchedule={async (scheduledAt: Date) => {
					try {
						await scheduleMessageMutation.mutateAsync({
							roomId: room._id,
							message,
							scheduledAt,
							tmid,
							tshow,
							previewUrls,
						});

						chat?.composer?.clear();
						dispatchToastMessage({ type: 'success', message: t('Message_scheduled_successfully') });
						setModal(null);
					} catch (error) {
						dispatchToastMessage({ type: 'error', message: t('Error_scheduling_message') });
					}
				}}
			/>,
		);
	}, [chat, room._id, tmid, tshow, previewUrls, scheduleMessageMutation, setModal, dispatchToastMessage, t]);

	return (
		<MessageComposerAction
			icon='clock'
			disabled={disabled}
			onClick={handleClick}
			title={t('Schedule_message')}
			data-qa-id='schedule-message'
		/>
	);
};

export default ScheduleMessageButton;
