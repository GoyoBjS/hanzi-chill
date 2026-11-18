import { day } from './model'

export function reminderCalendar(time: string, now = new Date()) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Elige una hora válida.')
  const [hours, minutes] = time.split(':').map(Number)
  const passed = hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(passed))
  const timestamp = now.toISOString().replace(/[-:]|\.\d{3}/g, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hanzi Chill//Recordatorio diario//ES',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@hanzi-chill`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${day(start).replaceAll('-', '')}T${time.replace(':', '')}00`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    'TRANSP:TRANSPARENT',
    'SUMMARY:Repasar chino con Hanzi Chill',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0M',
    'DESCRIPTION:Es hora de repasar chino.',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
