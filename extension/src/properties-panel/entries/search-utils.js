export function normalizeConcepts(result) {
  const concepts = result?.concepts || result?.items || [];
  return Array.isArray(concepts) ? concepts : [];
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
