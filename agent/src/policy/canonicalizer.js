



class Canonicalizer {



  canonicalize(data) {
    if (typeof data === 'string') {
      return this._canonicalizeString(data).normalized;
    } else if (typeof data === 'object' && data !== null) {
      const result = Array.isArray(data) ? [] : {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = this.canonicalize(value);
      }
      return result;
    }
    return data;
  }




  canonicalizeWithTrace(data) {
    const transformations = new Set();

    const process = (val) => {
      if (typeof val === 'string') {
        const { normalized, applied } = this._canonicalizeString(val);
        applied.forEach((t) => transformations.add(t));
        return normalized;
      } else if (typeof val === 'object' && val !== null) {
        const result = Array.isArray(val) ? [] : {};
        for (const [k, v] of Object.entries(val)) {
          result[k] = process(v);
        }
        return result;
      }
      return val;
    };

    const dataResult = process(data);
    return {
      data: dataResult,
      transformations: Array.from(transformations)
    };
  }







  _canonicalizeString(str) {
    if (!str) return { normalized: str, applied: [] };

    let normalized = str;
    const applied = [];


    const nfkc = normalized.normalize('NFKC');
    if (nfkc !== normalized) {
      normalized = nfkc;
      applied.push('NFKC');
    }


    const stripped = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '').
    replace(/[^\x20-\x7E\u00A0-\u00FF\n\r\t]/g, '');
    if (stripped !== normalized) {
      normalized = stripped;
      applied.push('STRIP_INVISIBLE');
    }


    const collapsed = normalized.replace(/[ \t]+/g, ' ').trim();
    if (collapsed !== normalized) {
      normalized = collapsed;
      applied.push('COLLAPSE_WS');
    }

    return { normalized, applied };
  }
}

module.exports = new Canonicalizer();