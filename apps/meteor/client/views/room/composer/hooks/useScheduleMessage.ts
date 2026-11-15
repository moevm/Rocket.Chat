import { useEndpoint } from '@rocket.chat/ui-contexts';
import { useMutation } from '@tanstack/react-query';

type ScheduleMessageParams = {
	roomId: string;
	message: string;
	scheduledAt: Date;
	tmid?: string;
	previewUrls?: string[];
	tshow?: boolean;
};

export const useScheduleMessage = () => {
	const scheduleMessage = useEndpoint('POST', '/v1/chat.scheduleMessage');

	return useMutation({
		mutationFn: async ({ roomId, message, scheduledAt, tmid, previewUrls, tshow }: ScheduleMessageParams) => {
			const result = await scheduleMessage({
				roomId,
				message,
				scheduledAt: scheduledAt.toISOString(),
				tmid,
				previewUrls,
				tshow,
			});
			return result.scheduledMessage;
		},
	});
};
