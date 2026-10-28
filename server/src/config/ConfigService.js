/**
 * SINGLETON PATTERN (classic GoF version).
 * Only one ConfigService object exists in the whole app.
 *  - "private" constructor -> needs a secret token, so nobody outside can call "new ConfigService()"
 *  - static #instance      -> holds the one instance
 *  - getInstance()         -> global access point (lazy)
 */
const TOKEN = Symbol('ConfigService');

export class ConfigService {
  static #instance = null;

  constructor(token) {
    if (token !== TOKEN) {
      throw new Error('Use ConfigService.getInstance()');
    }
    this.currencySymbol = 'Rs';
    this.decimalPlaces = 2;
    // Smallest difference we treat as "zero" when comparing money (half a paisa)
    this.tolerance = 0.01;
  }

  static getInstance() {
    if (!ConfigService.#instance) {
      ConfigService.#instance = new ConfigService(TOKEN);
    }
    return ConfigService.#instance;
  }

  /**
   * Rounds money to 2 decimals, HALF_UP, working on the decimal text of the number.
   * Plain Math.round(x * 100) / 100 gets 1.005 wrong because 1.005 * 100 = 100.49999...
   */
  round(value) {
    const abs = Math.abs(value);
    const text = String(abs);
    let rounded;
    if (text.includes('e')) {
      rounded = Number(abs.toFixed(this.decimalPlaces));
    } else {
      const shifted = Math.round(Number(`${text}e${this.decimalPlaces}`));
      rounded = Number(`${shifted}e-${this.decimalPlaces}`);
    }
    const result = value < 0 ? -rounded : rounded;
    return result === 0 ? 0 : result; // no "-0"
  }

  // 400 -> "Rs 400.00"
  format(value) {
    return `${this.currencySymbol} ${this.round(value).toFixed(this.decimalPlaces)}`;
  }
}
