import { describe, expect, it } from 'vitest'
import { reminderCalendar } from './reminder'

describe('recordatorio diario', () => {
  it('exporta una serie con aviso a la hora local y empieza mañana si ya pasó', () => {
    const now = new Date(2026, 10, 30, 20)
    const next = reminderCalendar('19:15', now)
    expect(next).toContain('DTSTART:20261201T191500\r\n')
    expect(next).toContain('RRULE:FREQ=DAILY\r\n')
    expect(next).toContain('BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT0M')
    expect(reminderCalendar('21:00', now)).toContain('DTSTART:20261130T210000')
    expect(() => reminderCalendar('24:01', now)).toThrow('hora válida')
  })
})
