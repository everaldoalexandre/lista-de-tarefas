export type ParsedTask = {
  description: string;
  date?: string;
  priority?: 'low' | 'medium' | 'high';
  tags: string[];
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sunday_pt: 0,
  monday: 1, monday_pt: 1,
  tuesday: 2, tuesday_pt: 2,
  wednesday: 3, wednesday_pt: 3,
  thursday: 4, thursday_pt: 4,
  friday: 5, friday_pt: 5,
  saturday: 6, saturday_pt: 6,
};

function nextWeekday(name: string) {
  const target = WEEKDAYS[name];
  if (target === undefined) return null;
  const d = new Date();
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function parseTaskInput(raw: string): ParsedTask {
  let text = raw;
  let date: string | undefined;
  let priority: ParsedTask['priority'];

  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch) {
    date = dateMatch[1];
    text = text.replace(dateMatch[0], '');
  }

  if (!date && /\b(today|hoje)\b/i.test(text)) {
    date = new Date().toISOString().slice(0, 10);
    text = text.replace(/\b(today|hoje)\b/i, '');
  }

  if (!date) {
    const tomorrowMatch = text.match(/(^|\s)(tomorrow|amanh[aã]a?)($|\s|[.,!?])/i);
    if (tomorrowMatch) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      date = d.toISOString().slice(0, 10);
      text = text.replace(tomorrowMatch[2], '');
    }
  }

  if (!date) {
    const weekdayMatch = text.match(
      /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)\b/i
    );
    if (weekdayMatch) {
      const normalized = weekdayMatch[1].toLowerCase();
      const key = Object.keys(WEEKDAYS).find((k) => k === normalized || k === `${normalized}_pt`);
      const resolved = nextWeekday(key ?? normalized);
      if (resolved) {
        date = resolved;
        text = text.replace(weekdayMatch[0], '');
      }
    }
  }

  const priorityMatch = text.match(/\bp([123])\b/i);
  if (priorityMatch) {
    priority = ({ '1': 'high', '2': 'medium', '3': 'low' } as const)[priorityMatch[1]];
    text = text.replace(priorityMatch[0], '');
  }

  const tags: string[] = [];
  text = text.replace(/#([\w\-]{1,24})/g, (_, tag: string) => {
    tags.push(tag.toLowerCase());
    return '';
  });

  return {
    description: text.replace(/\s+/g, ' ').trim(),
    date,
    priority,
    tags,
  };
}
