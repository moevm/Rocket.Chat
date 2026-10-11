import { cronJobs } from '@rocket.chat/cron';
import type { Logger } from '@rocket.chat/logger';
import { ScheduledMessages, Rooms, Users } from '@rocket.chat/models';

import { executeSendMessage } from '../meteor-methods/messages/sendMessage';

const MAX_MESSAGES_PER_TICK = 50;
const CLEANUP_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export async function processScheduledMessages(logger: Logger): Promise<void> {
	try {
		const now = new Date();
		logger.debug(`Checking for scheduled messages at ${now.toISOString()}`);

		let processed = 0;

		while (processed < MAX_MESSAGES_PER_TICK) {
			const scheduledMsg = await ScheduledMessages.claimNextReadyToSend(now);
			if (!scheduledMsg) {
				break;
			}

			processed += 1;

			try {
				const room = await Rooms.findOneById(scheduledMsg.rid);
				if (!room) {
					await ScheduledMessages.updateStatus(scheduledMsg._id, 'failed', undefined, 'Room not found');
					logger.warn(`Scheduled message ${scheduledMsg._id}: Room ${scheduledMsg.rid} not found`);
					continue;
				}

				const user = await Users.findOneById(scheduledMsg.userId);
				if (!user) {
					await ScheduledMessages.updateStatus(scheduledMsg._id, 'failed', undefined, 'User not found');
					logger.warn(`Scheduled message ${scheduledMsg._id}: User ${scheduledMsg.userId} not found`);
					continue;
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
				logger.error(`Failed to send scheduled message ${scheduledMsg._id}:`, error);

				await ScheduledMessages.updateStatus(
					scheduledMsg._id,
					'failed',
					undefined,
					error instanceof Error ? error.message : String(error),
				);
			}
		}

		if (processed > 0) {
			logger.info(`Processed ${processed} scheduled messages`);
		}

		await ScheduledMessages.deleteOldMessages(new Date(Date.now() - CLEANUP_AFTER_MS));
	} catch (error) {
		logger.error('Error processing scheduled messages:', error);
		if (error instanceof Error) {
			logger.error('Error stack:', error.stack);
		}
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
		logger.error('Failed to start scheduled messages cron:', error);
		throw error;
	}
}
