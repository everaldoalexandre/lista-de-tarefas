export default function DataAtual() {
  const rawDate = new Date().toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long'});

    const [weekdayRaw, day, , monthRaw] = rawDate.replace(',', '').split(' ');

    const weekday = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1);
    const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);


  return (
    <h1 className="text-5xl font-extrabold text-gray-500">{weekday} {day}, <span className="text-gray-300">{month}</span></h1>
  );
}
