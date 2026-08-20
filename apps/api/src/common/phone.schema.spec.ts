import { PhoneNumberSchema } from '@src/common/phone.schema'

describe('PhoneNumberSchema', () => {
  test('accepts a valid E.164 string unchanged', () => {
    const result = PhoneNumberSchema.parse('+14018216400')
    expect(result).toBe('+14018216400')
  })

  test('coerces a digit-only JSON number input', () => {
    const result = PhoneNumberSchema.parse(14018216400)
    expect(result).toBe('+14018216400')
  })

  test('strips separators from a formatted string', () => {
    const result = PhoneNumberSchema.parse('+1 401-821-6400')
    expect(result).toBe('+14018216400')
  })

  test('strips a leading tel: prefix', () => {
    const result = PhoneNumberSchema.parse('tel:+14018216400')
    expect(result).toBe('+14018216400')
  })

  test('rejects a string that is still invalid after normalization', () => {
    expect(() => PhoneNumberSchema.parse('12345')).toThrow()
    expect(() => PhoneNumberSchema.parse('not-a-phone')).toThrow()
  })
})
