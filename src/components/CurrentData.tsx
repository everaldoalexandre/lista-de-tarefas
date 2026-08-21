export default function CurrentDate() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const formatted = formatter.format(new Date());

  const [weekdayRaw, monthRaw, dayRaw] = formatted.replace(',', '').split(' ');

  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const day = dayRaw;

  return (
    <h1 suppressHydrationWarning className="text-lg font-bold text-gray-500">
      {weekday} {day},{' '}
      <span suppressHydrationWarning className="text-gray-400">
        {month}
      </span>
    </h1>
  );
}
