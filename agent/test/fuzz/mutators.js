const INVISIBLE_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
const HOMOGLYPHS = { 'a': 'а', 'e': 'е', 'o': 'о', 'p': 'р', 'c': 'с', 'y': 'у' };

module.exports = {
  injectInvisible(str) {
    const chars = str.split('');
    for (let i = 0; i < 5; i++) {
      const pos = Math.floor(Math.random() * chars.length);
      const inv = INVISIBLE_CHARS[Math.floor(Math.random() * INVISIBLE_CHARS.length)];
      chars.splice(pos, 0, inv);
    }
    return chars.join('');
  },

  swapHomoglyphs(str) {
    return str.split('').map((c) => {
      if (HOMOGLYPHS[c.toLowerCase()] && Math.random() > 0.7) {
        return HOMOGLYPHS[c.toLowerCase()];
      }
      return c;
    }).join('');
  },

  deepNest(obj, depth = 10) {
    let current = obj;
    for (let i = 0; i < depth; i++) {
      current = { [`level_${i}`]: current };
    }
    return current;
  },

  longString(len = 5000) {
    return 'A'.repeat(len);
  },

  mutate(input) {
    if (typeof input === 'string') {
      const r = Math.random();
      if (r < 0.3) return this.injectInvisible(input);
      if (r < 0.6) return this.swapHomoglyphs(input);
      if (r < 0.8) return this.longString();
      return input;
    }
    if (typeof input === 'object' && input !== null) {
      const mutated = Array.isArray(input) ? [...input] : { ...input };
      Object.keys(mutated).forEach((key) => {
        mutated[key] = this.mutate(mutated[key]);
      });
      return mutated;
    }
    return input;
  }
};