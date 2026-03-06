



function applyOutputCap(result, maxSize = 10_000) {
  if (!result || typeof result !== 'object') return result;
  const cap = (val) => {
    if (typeof val === 'string' && val.length > maxSize) {
      return `${val.substring(0, maxSize)}... [TRUNCATED ${val.length - maxSize} bytes]`;
    }
    return val;
  };

  const capped = { ...result };
  ['stdout', 'stderr', 'content', 'logs', 'text', 'html'].forEach((field) => {
    if (capped[field]) capped[field] = cap(capped[field]);
  });

  return capped;
}

module.exports = { applyOutputCap };