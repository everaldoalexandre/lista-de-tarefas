export default function CurrentDate() {
  const date = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const formatted = formatter.format(date);

  const [weekdayRaw, monthRaw, dayRaw] = formatted.replace(',', '').split(' ');

  const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
  const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const day = dayRaw;


  return (
    <h1 className="text-lg font-bold text-gray-500">{weekday} {day}, <span className="text-gray-400">{month}</span></h1>
  );
}
