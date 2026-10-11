import { expect } from 'chai';
import { beforeEach, describe, it } from 'mocha';
import p from 'proxyquire';
import sinon from 'sinon';

const sandbox = sinon.createSandbox();

const claimNextReadyToSend = sandbox.stub();
const updateStatus = sandbox.stub();
const deleteOldMessages = sandbox.stub();
const findOneByIdRoom = sandbox.stub();
const findOneByIdUser = sandbox.stub();
const executeSendMessage = sandbox.stub();
const cronJobsAdd = sandbox.stub();

const logger = {
	debug: sandbox.stub(),
	info: sandbox.stub(),
	warn: sandbox.stub(),
	error: sandbox.stub(),
};

const { processScheduledMessages } = p.noCallThru().load('../../../../server/cron/scheduledMessages', {
	'@rocket.chat/cron': { cronJobs: { add: cronJobsAdd } },
	'@rocket.chat/models': {
		ScheduledMessages: {
			claimNextReadyToSend,
			updateStatus,
			deleteOldMessages,
		},
		Rooms: { findOneById: findOneByIdRoom },
		Users: { findOneById: findOneByIdUser },
	},
	'../meteor-methods/messages/sendMessage': { executeSendMessage },
});

describe('processScheduledMessages', () => {
	beforeEach(() => {
		sandbox.reset();
		deleteOldMessages.resolves({ deletedCount: 0 });
	});

	it('sends a claimed scheduled message and marks it as sent', async () => {
		const scheduledMsg = {
			_id: 'sm1',
			rid: 'rid1',
			userId: 'u1',
			msg: 'hello later',
			status: 'processing',
		};

		claimNextReadyToSend.onFirstCall().resolves(scheduledMsg).onSecondCall().resolves(null);
		findOneByIdRoom.resolves({ _id: 'rid1' });
		findOneByIdUser.resolves({ _id: 'u1', username: 'user' });
		executeSendMessage.resolves({ _id: 'msg1' });
		updateStatus.resolves({ modifiedCount: 1 });

		await processScheduledMessages(logger);

		expect(executeSendMessage.calledOnce).to.be.true;
		expect(executeSendMessage.firstCall.args[0]).to.equal('u1');
		expect(executeSendMessage.firstCall.args[1]).to.deep.include({ rid: 'rid1', msg: 'hello later' });
		expect(updateStatus.calledWith('sm1', 'sent')).to.be.true;
		expect(deleteOldMessages.calledOnce).to.be.true;
	});

	it('marks message failed when room is missing', async () => {
		claimNextReadyToSend.onFirstCall().resolves({ _id: 'sm2', rid: 'missing', userId: 'u1', msg: 'x' }).onSecondCall().resolves(null);
		findOneByIdRoom.resolves(null);
		updateStatus.resolves({ modifiedCount: 1 });

		await processScheduledMessages(logger);

		expect(executeSendMessage.called).to.be.false;
		expect(updateStatus.calledWith('sm2', 'failed', undefined, 'Room not found')).to.be.true;
	});
});
