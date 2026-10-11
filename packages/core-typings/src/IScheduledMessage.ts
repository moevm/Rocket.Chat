import type { IRocketChatRecord } from './IRocketChatRecord';
import type { IMessage } from './IMessage';
import type { IRoom } from './IRoom';
import type { IUser } from './IUser';

export type ScheduledMessageStatus = 'pending' | 'processing' | 'sent' | 'cancelled' | 'failed';

export interface IScheduledMessage extends IRocketChatRecord {
	rid: IRoom['_id'];
	tmid?: IMessage['_id'];
	msg: string;
	userId: IUser['_id'];
	scheduledAt: Date;
	scheduledBy: IUser['_id'];
	status: ScheduledMessageStatus;
	sentAt?: Date;
	failureReason?: string;
	previewUrls?: string[];
	tshow?: boolean;
	attachments?: IMessage['attachments'];
	file?: IMessage['file'];
	files?: IMessage['files'];
	createdAt: Date;
	updatedAt: Date;
}

export type IScheduledMessageInsert = Omit<IScheduledMessage, '_id' | 'createdAt' | 'updatedAt' | '_updatedAt'>;

export type IScheduledMessageUpdate = Partial<Pick<IScheduledMessage, 'scheduledAt' | 'msg' | 'status' | 'failureReason' | 'sentAt'>>;
