export function normalizeConcepts(result) {
  const concepts = result?.concepts || result?.items || [];
  return Array.isArray(concepts) ? concepts : [];
}

export function getSearchResultSummary({ displayedCount, total, offset = 0 } = {}) {
  if (!Number.isSafeInteger(displayedCount) || displayedCount <= 0) {
    return '';
  }

  const normalizedOffset = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  const hasReliableTotal = Number.isSafeInteger(total)
    && total >= normalizedOffset + displayedCount;

  if (!hasReliableTotal) {
    return `Showing ${displayedCount} results`;
  }

  if (normalizedOffset > 0) {
    return `Showing results ${normalizedOffset + 1}-${normalizedOffset + displayedCount} of ${total}`;
  }

  return `Showing ${displayedCount} of ${total} results`;
}

export function getConceptLabel(concept) {
  return concept?.display || concept?.code || '';
}

export function getAutocompleteSuffix(term, concept) {
  const label = getConceptLabel(concept);

  if (!term || !label || label.length <= term.length) {
    return '';
  }

  if (!label.toLowerCase().startsWith(term.toLowerCase())) {
    return '';
  }

  return label.slice(term.length);
}
