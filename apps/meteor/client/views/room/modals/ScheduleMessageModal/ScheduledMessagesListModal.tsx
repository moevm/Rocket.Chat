import type { IScheduledMessage } from '@rocket.chat/core-typings';
import { Box, Button, Icon, Throbber } from '@rocket.chat/fuselage';
import { GenericModal } from '@rocket.chat/ui-client';
import { useEndpoint, useToastMessageDispatch, useTranslation } from '@rocket.chat/ui-contexts';
import { useCallback, useEffect, useState } from 'react';

type ScheduledMessagesListModalProps = {
	roomId: string;
	onClose: () => void;
};

const ScheduledMessagesListModal = ({ roomId, onClose }: ScheduledMessagesListModalProps) => {
	const t = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();
	const getScheduledMessages = useEndpoint('GET', '/v1/chat.getScheduledMessages');
	const cancelScheduledMessage = useEndpoint('DELETE', '/v1/chat.cancelScheduledMessage');

	const [messages, setMessages] = useState<IScheduledMessage[]>([]);
	const [loading, setLoading] = useState(true);

	const loadMessages = useCallback(async () => {
		try {
			setLoading(true);
			const result = await getScheduledMessages({
				roomId,
				status: 'pending',
				count: 50,
				offset: 0,
			});
			setMessages(result.scheduledMessages);
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		} finally {
			setLoading(false);
		}
	}, [dispatchToastMessage, getScheduledMessages, roomId]);

	useEffect(() => {
		void loadMessages();
	}, [loadMessages]);

	const handleCancel = async (messageId: string) => {
		try {
			await cancelScheduledMessage({ messageId });
			dispatchToastMessage({ type: 'success', message: t('Scheduled_message_cancelled') });
			await loadMessages();
		} catch (error) {
			dispatchToastMessage({ type: 'error', message: error });
		}
	};

	return (
		<GenericModal title={t('Scheduled_Messages')} icon={null} onClose={onClose} onConfirm={onClose} confirmText={t('Close')}>
			{loading ? (
				<Box display='flex' justifyContent='center' p={24}>
					<Throbber />
				</Box>
			) : messages.length === 0 ? (
				<Box textAlign='center' p={24} color='hint'>
					{t('No_scheduled_messages')}
				</Box>
			) : (
				<Box display='flex' flexDirection='column' gap={8}>
					{messages.map((message) => (
						<Box
							key={message._id}
							p={16}
							borderWidth={1}
							borderColor='neutral-300'
							borderRadius={4}
							display='flex'
							flexDirection='column'
							gap={8}
						>
							<Box display='flex' alignItems='center' gap={4} fontScale='p2' color='hint'>
								<Icon name='clock' size='x16' />
								{new Date(message.scheduledAt).toLocaleString()}
							</Box>
							<Box fontScale='p2' withTruncatedText>
								{message.msg}
							</Box>
							<Box display='flex' justifyContent='flex-end'>
								<Button small danger onClick={() => handleCancel(message._id)} title={t('Cancel')}>
									<Icon name='trash' size='x16' />
								</Button>
							</Box>
						</Box>
					))}
				</Box>
			)}
		</GenericModal>
	);
};

export default ScheduledMessagesListModal;
