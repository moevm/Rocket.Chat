import { SidebarItemBadge } from '@rocket.chat/fuselage';
import { useTranslation } from 'react-i18next';

type DraftBadgeProps = {
	roomTitle?: string;
};

const DraftBadge = ({ roomTitle }: DraftBadgeProps) => {
	const { t } = useTranslation();

	return (
		<SidebarItemBadge
			variant='warning'
			title={t('Draft_message')}
			role='status'
			aria-label={roomTitle ? t('__draftMessage__from__roomTitle__', { roomTitle }) : t('Draft_message')}
		>
			{t('Draft')}
		</SidebarItemBadge>
	);
};

export default DraftBadge;
