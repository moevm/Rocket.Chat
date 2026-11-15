import { isInviteSubscription, isOmnichannelRoom } from '@rocket.chat/core-typings';
import type { SubscriptionWithRoom } from '@rocket.chat/ui-contexts';

import InvitationBadge from '../../../../components/InvitationBadge';
import DraftBadge from '../../../../sidebar/badges/DraftBadge';
import { useRoomDraft } from '../../../../sidebar/hooks/useRoomDraft';
import UnreadBadge from '../../sidebar/badges/UnreadBadge';
import { useUnreadDisplay } from '../../sidebar/hooks/useUnreadDisplay';
import SidePanelOmnichannelBadges from '../omnichannel/SidePanelOmnichannelBadges';

export type RoomSidePanelItemBadgesProps = {
	room: SubscriptionWithRoom;
	roomTitle?: string;
};

const RoomSidePanelItemBadges = ({ room, roomTitle }: RoomSidePanelItemBadgesProps) => {
	const { unreadCount, unreadTitle, unreadVariant, showUnread } = useUnreadDisplay(room);
	const showDraft = useRoomDraft(room);

	return (
		<>
			{isOmnichannelRoom(room) && <SidePanelOmnichannelBadges room={room} />}
			{showUnread && <UnreadBadge title={unreadTitle} roomTitle={roomTitle} variant={unreadVariant} total={unreadCount.total} />}
			{isInviteSubscription(room) && <InvitationBadge invitationDate={room.ts} />}
			{showDraft && <DraftBadge roomTitle={roomTitle} />}
		</>
	);
};

export default RoomSidePanelItemBadges;
