export default function CurrentDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const weekday = get('weekday');
  const month = get('month');
  const day = get('day');

  return (
    <h1 suppressHydrationWarning className="text-lg font-bold text-foreground">
      {weekday} {day},{' '}
      <span suppressHydrationWarning className="text-muted-foreground">
        {month}
      </span>
    </h1>
  );
}
