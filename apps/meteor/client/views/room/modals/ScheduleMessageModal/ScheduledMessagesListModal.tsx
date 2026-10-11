import type { IScheduledMessage, Serialized } from '@rocket.chat/core-typings';
import { Box, Button, Icon, Throbber } from '@rocket.chat/fuselage';
import { GenericModal } from '@rocket.chat/ui-client';
import { useEndpoint, useToastMessageDispatch, useTranslation } from '@rocket.chat/ui-contexts';
import { useCallback, useEffect, useState } from 'react';

type ScheduledMessagesListModalProps = {
	roomId: string;
	onClose: () => void;
};

const visibleStatuses = new Set(['pending', 'processing', 'failed']);

const ScheduledMessagesListModal = ({ roomId, onClose }: ScheduledMessagesListModalProps) => {
	const t = useTranslation();
	const dispatchToastMessage = useToastMessageDispatch();
	const getScheduledMessages = useEndpoint('GET', '/v1/chat.getScheduledMessages');
	const cancelScheduledMessage = useEndpoint('POST', '/v1/chat.cancelScheduledMessage');

	const [messages, setMessages] = useState<Serialized<IScheduledMessage>[]>([]);
	const [loading, setLoading] = useState(true);

	const loadMessages = useCallback(async () => {
		try {
			setLoading(true);
			const result = await getScheduledMessages({
				roomId,
				count: 50,
				offset: 0,
			});
			setMessages(result.scheduledMessages.filter((message) => visibleStatuses.has(message.status)));
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
				<Box display='flex' justifyContent='center' padding={24}>
					<Throbber />
				</Box>
			) : messages.length === 0 ? (
				<Box textAlign='center' padding={24} color='hint'>
					{t('No_scheduled_messages')}
				</Box>
			) : (
				<Box display='flex' flexDirection='column' gap={8}>
					{messages.map((message) => (
						<Box
							key={message._id}
							padding={16}
							borderWidth='default'
							borderColor='neutral-300'
							borderRadius='medium'
							display='flex'
							flexDirection='column'
							gap={8}
						>
							<Box display='flex' alignItems='center' gap={4} fontScale='p2' color='hint'>
								<Icon name='clock' size='x16' />
								{new Date(message.scheduledAt).toLocaleString()}
							</Box>
							{message.status === 'failed' && (
								<Box fontScale='c1' color='danger'>
									{message.failureReason
										? t('Scheduled_message_failed_with_reason', { reason: message.failureReason })
										: t('Scheduled_message_failed')}
								</Box>
							)}
							{message.status === 'processing' && (
								<Box fontScale='c1' color='hint'>
									{t('Scheduled_message_processing')}
								</Box>
							)}
							<Box fontScale='p2' withTruncatedText>
								{message.msg}
							</Box>
							{message.status === 'pending' && (
								<Box display='flex' justifyContent='flex-end'>
									<Button small danger onClick={() => handleCancel(message._id)} title={t('Cancel')}>
										<Icon name='trash' size='x16' />
									</Button>
								</Box>
							)}
						</Box>
					))}
				</Box>
			)}
		</GenericModal>
	);
};

export default ScheduledMessagesListModal;
