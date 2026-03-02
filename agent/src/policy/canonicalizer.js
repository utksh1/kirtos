/**
 * Canonicalizer: Defeats "Invisible Character" or Unicode-level bypasses
 * by normalizing strings before they reach the Guard or Policy Engine.
 */
class Canonicalizer {
    /**
     * Deeply canonicalizes an object or string.
     */
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

    /**
     * Deeply canonicalizes and returns a list of all transformations applied.
     */
    canonicalizeWithTrace(data) {
        const transformations = new Set();

        const process = (val) => {
            if (typeof val === 'string') {
                const { normalized, applied } = this._canonicalizeString(val);
                applied.forEach(t => transformations.add(t));
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

    /**
     * String normalization pipeline:
     * 1. Unicode Normalization (NFKC)
     * 2. Whitespace collapsing (single space)
     * 3. Removing control characters and zero-width chars
     */
    _canonicalizeString(str) {
        if (!str) return { normalized: str, applied: [] };

        let normalized = str;
        const applied = [];

        // 1. Unicode Normalization: NFKC
        const nfkc = normalized.normalize('NFKC');
        if (nfkc !== normalized) {
            normalized = nfkc;
            applied.push('NFKC');
        }

        // 2. Remove invisible/zero-width characters and control chars
        const stripped = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[^\x20-\x7E\u00A0-\u00FF\n\r\t]/g, '');
        if (stripped !== normalized) {
            normalized = stripped;
            applied.push('STRIP_INVISIBLE');
        }

        // 3. Whitespace collapsing
        const collapsed = normalized.replace(/[ \t]+/g, ' ').trim();
        if (collapsed !== normalized) {
            normalized = collapsed;
            applied.push('COLLAPSE_WS');
        }

        return { normalized, applied };
    }
}

module.exports = new Canonicalizer();
