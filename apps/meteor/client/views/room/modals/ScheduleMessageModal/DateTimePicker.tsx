import { Box, InputBox, Margins } from '@rocket.chat/fuselage';
import { useTranslation } from '@rocket.chat/ui-contexts';
import { format } from 'date-fns';
import type { ChangeEvent } from 'react';

type DateTimePickerProps = {
	value: Date;
	onChange: (date: Date) => void;
	error?: boolean;
};

const DateTimePicker = ({ value, onChange, error }: DateTimePickerProps) => {
	const t = useTranslation();

	const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
		const [year, month, day] = e.target.value.split('-').map(Number);
		if (!year || !month || !day) {
			return;
		}
		const next = new Date(value);
		next.setFullYear(year, month - 1, day);
		onChange(next);
	};

	const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
		const [hours, minutes] = e.target.value.split(':').map(Number);
		if (Number.isNaN(hours) || Number.isNaN(minutes)) {
			return;
		}
		const next = new Date(value);
		next.setHours(hours, minutes, 0, 0);
		onChange(next);
	};

	const dateValue = !isNaN(value.getTime()) ? format(value, 'yyyy-MM-dd') : '';
	const timeValue = !isNaN(value.getTime()) ? format(value, 'HH:mm') : '';
	const minDate = format(new Date(), 'yyyy-MM-dd');
	const errorProp = error ? 'error' : undefined;

	return (
		<Box display='flex' width='full' marginInline='neg-x4'>
			<Margins inline={4}>
				<InputBox
					type='date'
					aria-label={t('Date')}
					flexGrow={1}
					minWidth={0}
					value={dateValue}
					min={minDate}
					onChange={handleDateChange}
					error={errorProp}
				/>
				<InputBox
					type='time'
					aria-label={t('Time')}
					flexGrow={1}
					minWidth={0}
					value={timeValue}
					onChange={handleTimeChange}
					error={errorProp}
				/>
			</Margins>
		</Box>
	);
};

export default DateTimePicker;
