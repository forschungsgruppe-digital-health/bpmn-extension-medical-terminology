import { html } from 'htm/preact';
import { useEffect, useRef, useState } from '@bpmn-io/properties-panel/preact/hooks';
import { TextAreaEntry, TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import {
  getAnnotations,
  addAnnotation,
  createId,
  getCodingKey,
  getUsedIds,
  getUsedCodingKeys,
  isValidId,
  removeAnnotation
} from '../../services/AnnotationHelper.js';
import {
  normalizeConcepts,
  getConceptLabel,
  getAutocompleteSuffix
} from './search-utils.js';

export function AnnotationListEntry(props) {
  const { element } = props;
  const moddle = useService('moddle');
  const modeling = useService('modeling');
  const elementRegistry = useService('elementRegistry', false);
  const terminologyRegistry = useService('terminologyRegistry', false);
  const terminologyProviderLoader = useService('terminologyProviderLoader', false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm());
  const [refreshToken, setRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(-1);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [formError, setFormError] = useState('');
  const searchRequestSequence = useRef(0);
  const searchBlurTimeout = useRef(null);
  const searchSuggestionItemRefs = useRef([]);
  const searchInputRef = useRef(null);

  const bo = element.businessObject;
  const annotations = getAnnotations(bo);

  function createEmptyForm() {
    return {
      id: '',
      text: '',
      codings: []
    };
  }

  function getRegisteredProviders() {
    return terminologyRegistry ? terminologyRegistry.listProviders() : [];
  }

  function getSearchableProviders() {
    return getRegisteredProviders()
      .filter(provider => provider.capabilities?.search !== false)
      .sort((first, second) => {
        const firstLabel = first.displayName || first.id || '';
        const secondLabel = second.displayName || second.id || '';
        const labelOrder = firstLabel.localeCompare(secondLabel, undefined, {
          numeric: true,
          sensitivity: 'base'
        });

        return labelOrder || first.id.localeCompare(second.id);
      });
  }

  function getSelectedProvider() {
    return getSearchableProviders().find(provider => provider.id === selectedProviderId) || null;
  }

  function getExistingIds() {
    if (!elementRegistry?.forEach) {
      return getUsedIds(bo);
    }

    const ids = [];

    elementRegistry.forEach((registryElement) => {
      const businessObject = registryElement.businessObject;

      if (!businessObject) {
        return;
      }

      ids.push(...getUsedIds(businessObject));
    });

    return ids;
  }

  function getExistingCodingKeys() {
    if (!elementRegistry?.forEach) {
      return getUsedCodingKeys(bo);
    }

    const keys = [];

    elementRegistry.forEach((registryElement) => {
      const businessObject = registryElement.businessObject;

      if (!businessObject) {
        return;
      }

      keys.push(...getUsedCodingKeys(businessObject));
    });

    return keys;
  }

  function getResolvedId(currentFormData) {
    const trimmedId = (currentFormData.id || '').trim();

    if (trimmedId) {
      return trimmedId;
    }

    return createId(getExistingIds());
  }

  function validateId(value) {
    const resolvedId = (value || '').trim();

    if (!resolvedId) {
      return;
    }

    if (!isValidId(resolvedId)) {
      return 'ID may only contain letters, numbers, dots, underscores, and hyphens.';
    }

    if (getExistingIds().includes(resolvedId)) {
      return 'ID must be unique across the diagram.';
    }
  }

  async function resolveProviderId(providerId) {
    if (providerId) {
      return providerId;
    }

    const selectedProvider = getSelectedProvider();

    if (selectedProvider || !terminologyProviderLoader) {
      return selectedProvider?.id || null;
    }

    return null;
  }

  async function runSearch(term, providerId) {
    const normalizedTerm = term.trim();
    const requestId = ++searchRequestSequence.current;

    setSearchError('');
    setSearchResults([]);
    setActiveSearchResultIndex(-1);

    if (!normalizedTerm) {
      setSearchBusy(false);
      return;
    }

    if (!terminologyRegistry) {
      setSearchBusy(false);
      setSearchError('No terminology registry configured (demo without live provider).');
      return;
    }

    if (!providerId) {
      setSearchBusy(false);
      setSearchError('Please select a terminology first.');
      return;
    }

    setSearchBusy(true);

    try {
      const resolvedProviderId = await resolveProviderId(providerId);

      if (requestId !== searchRequestSequence.current) {
        return;
      }

      if (!resolvedProviderId) {
        setSearchError('Unknown system and no dynamic terminology loader configured.');
        return;
      }

      const result = await terminologyRegistry.search(normalizedTerm, resolvedProviderId, { limit: 15, offset: 0 });

      if (requestId !== searchRequestSequence.current) {
        return;
      }

      const concepts = normalizeConcepts(result);
      setSearchResults(concepts);
      setActiveSearchResultIndex(concepts.length > 0 ? 0 : -1);
    } catch (e) {
      if (requestId !== searchRequestSequence.current) {
        return;
      }

      setSearchError('Search failed. Please check the terminology system or search term.');
    } finally {
      if (requestId === searchRequestSequence.current) {
        setSearchBusy(false);
      }
    }
  }

  function resetSearchState() {
    if (searchBlurTimeout.current) {
      clearTimeout(searchBlurTimeout.current);
      searchBlurTimeout.current = null;
    }

    setSearchTerm('');
    setSearchResults([]);
    setActiveSearchResultIndex(-1);
    setSearchError('');
    setSearchBusy(false);
    setSearchFocused(false);
  }

  function resetFormState() {
    searchRequestSequence.current += 1;
    setFormData(createEmptyForm());
    setSelectedProviderId('');
    resetSearchState();
    setFormError('');
  }

  function closeForm() {
    resetFormState();
    setShowForm(false);
  }

  function createCodingFromConcept(c) {
    const selectedProvider = getSelectedProvider();

    return {
      system: c.system || getSelectedProvider()?.systemUri || '',
      version: c.version || selectedProvider?.version || undefined,
      code: c.code || '',
      display: c.display || ''
    };
  }

  function addCodingToForm(coding, options = {}) {
    const { submit = false, refocus = false } = options;

    if (!coding.system || !coding.code) {
      return;
    }

    const alreadyExists = formData.codings.some(existing =>
      existing.system === coding.system &&
      existing.code === coding.code
    );

    const nextCodings = alreadyExists ? formData.codings : [ ...formData.codings, coding ];
    const nextFormData = {
      ...formData,
      codings: nextCodings
    };

    searchRequestSequence.current += 1;
    setFormData(nextFormData);
    resetSearchState();
    setFormError('');

    if (refocus) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }

    if (submit) {
      handleAdd(nextFormData);
    }
  }

  function applySearchResult(c, options = {}) {
    addCodingToForm(createCodingFromConcept(c), options);
  }

  function handleAdd(nextFormData = formData) {
    // Prevent adding empty annotations (require free text or at least one coding)
    const hasText = nextFormData.text && nextFormData.text.trim();
    const hasCodings = nextFormData.codings && nextFormData.codings.length > 0;

    if (!hasText && !hasCodings) {
      setFormError('Please provide free text or at least one coding before saving.');
      return;
    }

    const id = getResolvedId(nextFormData);

    const idError = validateId(id);

    if (idError) {
      return;
    }

    const existingCodingKeys = getExistingCodingKeys();
    const duplicateCodingKey = (nextFormData.codings || [])
      .map(getCodingKey)
      .find((key) => key && existingCodingKeys.includes(key));

    if (duplicateCodingKey) {
      setFormError('A terminology code with the same system and code is already used in the diagram.');
      return;
    }

    setFormError('');

    addAnnotation(bo, moddle, {
      id,
      text: nextFormData.text || undefined,
      codings: nextFormData.codings
    });

    // Force re-render and mark model as changed
    modeling.updateModdleProperties(element, bo, {});
    closeForm();
    setRefresh(n => n + 1);
  }

  function handleRemove(index) {
    removeAnnotation(bo, index);
    modeling.updateModdleProperties(element, bo, {});
    setRefresh(n => n + 1);
  }

  function handlePreset(e) {
    const providerId = e.target.value;
    searchRequestSequence.current += 1;
    setSelectedProviderId(providerId);
    resetSearchState();
  }

  function handleSearchInput(e) {
    const value = e.target.value;

    if (searchBlurTimeout.current) {
      clearTimeout(searchBlurTimeout.current);
      searchBlurTimeout.current = null;
    }

    setSearchFocused(true);
    setSearchTerm(value);
    void runSearch(value, selectedProviderId);
  }

  function handleSearchFocus() {
    if (searchBlurTimeout.current) {
      clearTimeout(searchBlurTimeout.current);
      searchBlurTimeout.current = null;
    }

    setSearchFocused(true);
  }

  function handleSearchBlur() {
    if (searchBlurTimeout.current) {
      clearTimeout(searchBlurTimeout.current);
    }

    searchBlurTimeout.current = setTimeout(() => {
      setSearchFocused(false);
      searchBlurTimeout.current = null;
    }, 120);
  }

  function acceptSearchSuggestion(result) {
    const label = getConceptLabel(result);

    if (!label) {
      return;
    }

    searchRequestSequence.current += 1;
    setSearchTerm(label);
    setSearchFocused(true);
    setActiveSearchResultIndex(-1);

    requestAnimationFrame(() => {
      if (searchInputRef.current) {
        const caretPosition = label.length;
        searchInputRef.current.focus();
        searchInputRef.current.setSelectionRange(caretPosition, caretPosition);
      }
    });

    void runSearch(label, selectedProviderId);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setSearchFocused(false);
      return;
    }

    if (!searchResults.length) {
      if ((e.key === 'Enter' || e.key === 'Tab') && activeSearchResult && searchTerm.trim()) {
        e.preventDefault();
        e.stopPropagation();
        applySearchResult(activeSearchResult, {
          refocus: true
        });
        return;
      }

      if (e.key === 'Tab' && !e.shiftKey && !searchTerm.trim()) {
        e.preventDefault();
        e.stopPropagation();
        handleAdd();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setActiveSearchResultIndex(current => Math.min(current + 1, searchResults.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setActiveSearchResultIndex(current => Math.max(current - 1, 0));
      return;
    }

    if (e.key === 'ArrowRight') {
      const selectedIndex = activeSearchResultIndex >= 0 ? activeSearchResultIndex : 0;
      const selectedResult = searchResults[selectedIndex] || activeSearchResult;

      if (selectedResult) {
        e.preventDefault();
        e.stopPropagation();
        acceptSearchSuggestion(selectedResult);
      }
      return;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      const selectedIndex = activeSearchResultIndex >= 0 ? activeSearchResultIndex : 0;
      const selectedResult = searchResults[selectedIndex] || activeSearchResult;

      if (selectedResult) {
        e.preventDefault();
        e.stopPropagation();
        applySearchResult(selectedResult, {
          refocus: true
        });
      }
    }
  }

  function handleFormKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeForm();
    }
  }

  function handleSubmitOnTab(e) {
    if (e.key !== 'Tab' || e.shiftKey) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    handleAdd();
  }

  function handleRemoveCoding(index) {
    setFormData(current => ({
      ...current,
      codings: current.codings.filter((_, codingIndex) => codingIndex !== index)
    }));
  }

  function updateField(field, value) {
    setFormData(current => ({ ...current, [field]: value }));
    if (field === 'text' && value && value.trim()) {
      setFormError('');
    }
  }

  useEffect(() => {
    if (!terminologyRegistry || typeof terminologyRegistry.on !== 'function' || typeof terminologyRegistry.off !== 'function') {
      return undefined;
    }

    const rerender = () => setRefresh(current => current + 1);

    terminologyRegistry.on('provider:registered', rerender);
    terminologyRegistry.on('provider:unregistered', rerender);

    return () => {
      terminologyRegistry.off('provider:registered', rerender);
      terminologyRegistry.off('provider:unregistered', rerender);
    };
  }, [terminologyRegistry]);

  useEffect(() => {
    if (!selectedProviderId) {
      return;
    }

    if (getSearchableProviders().some(provider => provider.id === selectedProviderId)) {
      return;
    }

    searchRequestSequence.current += 1;
    setSelectedProviderId('');
    resetSearchState();
  }, [refreshToken, selectedProviderId, terminologyRegistry]);

  const [searchFocused, setSearchFocused] = useState(false);
  const searchableProviders = getSearchableProviders();
  const hasSearchableProviders = searchableProviders.length > 0;
  const activeSearchResult = searchResults[activeSearchResultIndex >= 0 ? activeSearchResultIndex : 0] || null;
  const searchCompletion = getAutocompleteSuffix(searchTerm, activeSearchResult);
  const showSearchSuggestions = searchFocused && searchResults.length > 0;
  const resolvedId = getResolvedId(formData);

  useEffect(() => {
    if (!showSearchSuggestions || activeSearchResultIndex < 0) {
      return;
    }

    const activeItem = searchSuggestionItemRefs.current[activeSearchResultIndex];

    if (activeItem) {
      activeItem.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [activeSearchResultIndex, showSearchSuggestions]);

  useEffect(() => {
    const searchInput = searchInputRef.current;

    if (!searchInput) {
      return;
    }

    const nativeKeyDownHandler = (event) => {
      handleSearchKeyDown(event);
    };

    searchInput.addEventListener('keydown', nativeKeyDownHandler, true);

    return () => {
      searchInput.removeEventListener('keydown', nativeKeyDownHandler, true);
    };
  }, [
    activeSearchResult,
    activeSearchResultIndex,
    formData,
    searchResults,
    searchTerm
  ]);

  return html`
    <div class="clinical-annotations">

      <!-- Existing annotations list -->
      ${annotations.length > 0 && html`
        <div class="annotation-list">
          ${annotations.map((ann, i) => html`
            <div class="annotation-item annotation-item--saved">
              <div class="annotation-item__header">
                ${ann.id && html`<code class="coding-code">${ann.id}</code>`}
                <button
                  class="annotation-item__remove"
                  title="Remove"
                  onClick=${() => handleRemove(i)}
                >×</button>
              </div>
              ${ann.text && html`
                <div class="annotation-item__text">${ann.text}</div>
              `}
              ${(ann.codings || []).map(c => html`
                <div class="annotation-item__coding">
                  <span class="coding-system">${getSystemShortName(c.system, terminologyRegistry)}</span>
                  <code class="coding-code">${c.code}</code>
                  ${c.display && html`<span class="coding-display">${c.display}</span>`}
                </div>
              `)}
            </div>
          `)}
        </div>
      `}

      ${annotations.length === 0 && !showForm && html`
        <div class="annotation-empty">No annotations yet.</div>
      `}

      <!-- Add button -->
      ${!showForm && html`
        <button class="annotation-add-btn" onClick=${() => setShowForm(true)}>
          + Add annotation
        </button>
      `}

      <!-- Add form -->
      ${showForm && html`
        <div class="annotation-form" onKeyDown=${handleFormKeyDown}>
          <${TextFieldEntry}
            element=${bo}
            id="annotation-id"
            label="ID"
            placeholder=${resolvedId}
            debounce=${(fn) => fn}
            getValue=${() => formData.id}
            setValue=${(value) => updateField('id', value)}
            validate=${validateId}
          />

          <${TextAreaEntry}
            element=${bo}
            id="annotation-text"
            label="Free text"
            placeholder="Description in natural language..."
            debounce=${(fn) => fn}
            rows=${2}
            getValue=${() => formData.text}
            setValue=${(value) => updateField('text', value)}
          />

          <fieldset class="form-fieldset">
            <legend>Coding (optional)</legend>
            ${!hasSearchableProviders ? html`
             <div class="form-row">
               <div class="form-hint">
                 No terminology systems are available right now.
               </div>
             </div>
            ` : html`
             <div class="form-row">
               <label class="bio-properties-panel-label">Terminology</label>
               <select
                 class="bio-properties-panel-input"
                 value=${selectedProviderId}
                 onChange=${handlePreset}
                 onKeyDownCapture=${!selectedProviderId ? handleSubmitOnTab : undefined}
               >
                 <option value="">– select –</option>
                 ${searchableProviders.map(p =>
                   html`<option value=${p.id}>${p.displayName}</option>`
                 )}
               </select>
             </div>
            `}
            ${formData.codings.length > 0 && html`
             <div class="form-row">
               <label class="bio-properties-panel-label">Selected codings</label>
               <div class="selected-codings">
                  ${formData.codings.map((coding, index) => html`
                    <div class="selected-coding">
                      <div class="selected-coding__content">
                        <span class="coding-system">${getSystemShortName(coding.system, terminologyRegistry)}</span>
                        <code class="coding-code">${coding.code}</code>
                        ${coding.display && html`<span class="coding-display">${coding.display}</span>`}
                      </div>
                      <button
                        type="button"
                        class="selected-coding__remove"
                        title="Remove coding"
                        onClick=${() => handleRemoveCoding(index)}
                      >×</button>
                    </div>
                  `)}
                </div>
              </div>
            `}
            ${selectedProviderId && html`
              <div class="form-row">
               <label class="bio-properties-panel-label">Search ${searchBusy ? '(searching...)' : ''}</label>
                <div class="search-field">
                  <div class="search-input-shell ${searchFocused ? 'search-input-shell--focused' : ''}">
                    <div class="search-input-ghost" aria-hidden="true">
                      <span class="search-input-ghost__typed">${searchTerm}</span><span class="search-input-ghost__completion">${searchCompletion}</span>
                    </div>
                    <input
                      ref=${searchInputRef}
                      class="search-input-field"
                      type="text"
                      placeholder="Enter term"
                      value=${searchTerm}
                      onInput=${handleSearchInput}
                      onFocus=${handleSearchFocus}
                      onBlur=${handleSearchBlur}
                      autocomplete="off"
                    />
                  </div>
                  ${showSearchSuggestions && html`
                    <div class="search-suggestions" role="listbox">
                      ${searchResults.map((c, index) => html`
                        <div
                          class="search-suggestion ${index === activeSearchResultIndex ? 'search-suggestion--active' : ''}"
                          ref=${(node) => {
                            searchSuggestionItemRefs.current[index] = node;
                          }}
                          onMouseMove=${() => setActiveSearchResultIndex(index)}
                          onMouseDown=${(event) => {
                            event.preventDefault();
                            if (searchBlurTimeout.current) {
                              clearTimeout(searchBlurTimeout.current);
                              searchBlurTimeout.current = null;
                            }
                            applySearchResult(c);
                          }}
                        >
                          <div class="search-suggestion__label">${getConceptLabel(c)}</div>
                          <div class="search-suggestion__meta">
                            <span class="coding-system">${getSystemShortName(c.system || getSelectedProvider()?.systemUri, terminologyRegistry)}</span>
                            <code class="coding-code">${c.code}</code>
                          </div>
                        </div>
                      `)}
                    </div>
                  `}
                </div>
              </div>
              <div class="form-row">
                <div class="form-hint">
                  Press Tab or Enter to add an annotation (multiple entries allowed).
                  To submit, press Tab in the empty search field.
                </div>
              </div>
            `}
            ${searchError && html`<div class="bio-properties-panel-error">${searchError}</div>`}
          </fieldset>

          ${formError && html`<div class="bio-properties-panel-error">${formError}</div>`}

          <div class="form-row">
            <button
              type="button"
              class="annotation-submit-btn bio-properties-panel-button"
              onClick=${() => handleAdd()}
            >Save annotation</button>
          </div>
        </div>
      `}
    </div>
  `;
}

function getSystemShortName(uri, registry) {
  if (!uri) return '';
  if (registry) {
    // Sucht den registrierten Namen dynamisch heraus
    const provider = registry.listProviders().find(p => p.systemUri === uri);
    if (provider && provider.displayName) return provider.displayName;
  }
  // Fallback: Zeigt einfach den letzten Teil der URL, wenn der Provider nicht registriert ist
  return uri.split('/').pop();
}
