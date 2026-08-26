import { describe, it, expect } from 'vitest';
import {
  userDayKey,
  localDayKey,
  userEndOfDay,
  userEndOfWeek,
  parseTzParam,
  isDateOnlyString,
} from '@/lib/date-utils';

describe('userDayKey', () => {
  it('converte instante UTC para o dia local do usuário', () => {
    // 2026-08-27T01:00:00Z ainda é 2026-08-26 no Brasil (UTC-3)
    const instant = new Date('2026-08-27T01:00:00Z');
    expect(userDayKey(180, instant)).toBe('2026-08-26');
  });

  it('com tz=0 equivale ao dia UTC', () => {
    const instant = new Date('2026-08-27T01:00:00Z');
    expect(userDayKey(0, instant)).toBe('2026-08-27');
  });

  it('fuso oeste cruza para o dia anterior perto da meia-noite', () => {
    // 05:30 UTC = 00:30 em UTC-5 -> mesmo dia 26? 05:30 - 5h = 00:30 do dia 27? não:
    const instant = new Date('2026-08-26T05:30:00Z');
    expect(userDayKey(300, instant)).toBe('2026-08-26');
  });

  it('fuso negativo (leste) adianta o dia', () => {
    const instant = new Date('2026-08-26T20:00:00Z');
    // UTC+5 -> já é 27
    expect(userDayKey(-300, instant)).toBe('2026-08-27');
  });
});

describe('localDayKey', () => {
  it('retorna string YYYY-MM-DD', () => {
    expect(localDayKey(new Date('2026-08-26T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('userEndOfDay', () => {
  it('23:59:59.999 no fuso do usuário (UTC-3)', () => {
    // 00:30Z = 21:30 de 25/08 em BRT -> fim do dia local (25/08) = 02:59:59.999Z de 26/08
    const base = new Date('2026-08-26T00:30:00Z');
    const end = userEndOfDay(180, base);
    expect(end.toISOString()).toBe('2026-08-26T02:59:59.999Z');
  });

  it('meia-noite exata em UTC com tz=0 fecha o mesmo dia', () => {
    const base = new Date('2026-08-26T10:00:00Z');
    expect(userEndOfDay(0, base).toISOString()).toBe('2026-08-26T23:59:59.999Z');
  });
});

describe('userEndOfWeek', () => {
  it('é 7 dias após o fim do dia atual', () => {
    const base = new Date('2026-08-26T10:00:00Z');
    const day = userEndOfDay(180, base);
    const week = userEndOfWeek(180, base);
    expect(week.getTime() - day.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('parseTzParam', () => {
  it('aceita offset válido', () => {
    expect(parseTzParam('180')).toBe(180);
    expect(parseTzParam('-300')).toBe(-300);
    expect(parseTzParam('0')).toBe(0);
  });

  it('rejeita ausência, lixo e valores fora do intervalo', () => {
    expect(parseTzParam(null)).toBeNull();
    expect(parseTzParam('')).toBeNull();
    expect(parseTzParam('abc')).toBeNull();
    expect(parseTzParam('2000')).toBeNull();
    expect(parseTzParam('1.5')).toBe(2); // arredonda para minuto inteiro
  });
});

describe('isDateOnlyString', () => {
  it('aceita datas YYYY-MM-DD válidas', () => {
    expect(isDateOnlyString('2026-08-26')).toBe(true);
  });

  it('rejeita formatos inválidos e datas impossíveis', () => {
    expect(isDateOnlyString('26-08-2026')).toBe(false);
    expect(isDateOnlyString('2026-13-40')).toBe(false);
    expect(isDateOnlyString(42)).toBe(false);
    expect(isDateOnlyString(null)).toBe(false);
  });
});
