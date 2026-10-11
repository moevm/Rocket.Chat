import { cronJobs } from '@rocket.chat/cron';
import type { IScheduledMessage } from '@rocket.chat/core-typings';
import type { Logger } from '@rocket.chat/logger';
import { ScheduledMessages, Rooms, Users } from '@rocket.chat/models';

import { executeSendMessage } from '../meteor-methods/messages/sendMessage';

const MAX_MESSAGES_PER_TICK = 50;
const CLEANUP_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export const scheduledMessageJobName = (messageId: IScheduledMessage['_id']): string => `scheduled-message/${messageId}`;

async function sendClaimedScheduledMessage(scheduledMsg: IScheduledMessage, logger: Logger): Promise<void> {
	try {
		const room = await Rooms.findOneById(scheduledMsg.rid);
		if (!room) {
			await ScheduledMessages.updateStatus(scheduledMsg._id, 'failed', undefined, 'Room not found');
			logger.warn(`Scheduled message ${scheduledMsg._id}: Room ${scheduledMsg.rid} not found`);
			return;
		}

		const user = await Users.findOneById(scheduledMsg.userId);
		if (!user) {
			await ScheduledMessages.updateStatus(scheduledMsg._id, 'failed', undefined, 'User not found');
			logger.warn(`Scheduled message ${scheduledMsg._id}: User ${scheduledMsg.userId} not found`);
			return;
		}

		await executeSendMessage(
			scheduledMsg.userId,
			{
				rid: scheduledMsg.rid,
				msg: scheduledMsg.msg,
				...(scheduledMsg.tmid && { tmid: scheduledMsg.tmid }),
				...(scheduledMsg.tshow !== undefined && { tshow: scheduledMsg.tshow }),
			},
			{ previewUrls: scheduledMsg.previewUrls },
		);

		await ScheduledMessages.updateStatus(scheduledMsg._id, 'sent', new Date());
		logger.info(`Scheduled message ${scheduledMsg._id} sent successfully`);
	} catch (error) {
		logger.error({
			msg: `Failed to send scheduled message ${scheduledMsg._id}`,
			err: error,
		});

		await ScheduledMessages.updateStatus(
			scheduledMsg._id,
			'failed',
			undefined,
			error instanceof Error ? error.message : String(error),
		);
	} finally {
		await cronJobs.remove(scheduledMessageJobName(scheduledMsg._id)).catch(() => undefined);
	}
}

export async function processScheduledMessageById(messageId: IScheduledMessage['_id'], logger: Logger): Promise<void> {
	const scheduledMsg = await ScheduledMessages.claimById(messageId, new Date());
	if (!scheduledMsg) {
		return;
	}

	await sendClaimedScheduledMessage(scheduledMsg, logger);
}

export async function scheduleScheduledMessageJob(messageId: IScheduledMessage['_id'], scheduledAt: Date): Promise<void> {
	const { SystemLogger } = await import('../lib/logger/system');
	const logger = SystemLogger;

	await cronJobs.addAtTimestamp(scheduledMessageJobName(messageId), scheduledAt, async () => {
		await processScheduledMessageById(messageId, logger);
	});
}

export async function cancelScheduledMessageJob(messageId: IScheduledMessage['_id']): Promise<void> {
	await cronJobs.remove(scheduledMessageJobName(messageId)).catch(() => undefined);
}

export async function processScheduledMessages(logger: Logger): Promise<void> {
	try {
		logger.debug(`Checking for scheduled messages at ${new Date().toISOString()}`);

		let processed = 0;

		while (processed < MAX_MESSAGES_PER_TICK) {
			const scheduledMsg = await ScheduledMessages.claimNextReadyToSend(new Date());
			if (!scheduledMsg) {
				break;
			}

			processed += 1;
			await sendClaimedScheduledMessage(scheduledMsg, logger);
		}

		if (processed > 0) {
			logger.info(`Processed ${processed} scheduled messages`);
		}

		await ScheduledMessages.deleteOldMessages(new Date(Date.now() - CLEANUP_AFTER_MS));
	} catch (error) {
		logger.error({
			msg: 'Error processing scheduled messages',
			err: error,
		});
	}
}

export async function scheduledMessagesCron(logger: Logger): Promise<void> {
	try {
		logger.info('Starting scheduled messages cron');

		await processScheduledMessages(logger);

		await cronJobs.add('Process scheduled messages', '* * * * *', async () => {
			await processScheduledMessages(logger);
		});

		logger.info('Scheduled messages cron job registered successfully');
	} catch (error) {
		logger.error({
			msg: 'Failed to start scheduled messages cron',
			err: error,
		});
		throw error;
	}
}
