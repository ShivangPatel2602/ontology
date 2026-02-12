/**
 * OBO file parser for ontology hierarchy.
 * Extracts terms and their is_a relationships to build subclass trees.
 */

const MAIN_CLASSES = ["Method", "Scale", "Trait", "Variable"];

/**
 * Strip namespace prefix from OBO id (e.g. ns4:Trait -> Trait, ns4:CO_371:0000001 -> CO_371:0000001)
 */
function normalizeId(id) {
  const match = id.match(/^ns\d+:(.+)$/);
  return match ? match[1] : id;
}

/**
 * Parse OBO content into terms with id, name, and parent ids (from is_a)
 */
function parseTerms(oboContent) {
  const terms = new Map(); // id -> { id, name, parentIds[] }
  const blocks = oboContent.split(/\[Term\]\s*\n/);

  for (const block of blocks) {
    const idMatch = block.match(/^id:\s*(.+?)(?:\s|$)/m);
    if (!idMatch) continue;

    const rawId = idMatch[1].trim();
    const id = normalizeId(rawId);

    const nameMatch = block.match(/^name:\s*(.+?)(?:\s*$)/m);
    const name = nameMatch ? nameMatch[1].trim() : id;

    const parentIds = [];
    const isALines = block.match(/^is_a:\s*(.+?)(?:\s*!|$)/gm) || [];
    for (const line of isALines) {
      const parentMatch = line.match(/^is_a:\s*(.+?)(?:\s*!|$)/);
      if (parentMatch) {
        parentIds.push(normalizeId(parentMatch[1].trim()));
      }
    }

    terms.set(id, { id, name, parentIds });
  }

  return terms;
}

/**
 * Build child -> parents map from terms. Uses first is_a as primary parent for tree structure.
 */
function buildParentMap(terms) {
  const parentMap = new Map();
  for (const term of terms.values()) {
    if (term.parentIds.length > 0) {
      parentMap.set(term.id, term.parentIds[0]);
    }
  }
  return parentMap;
}

/**
 * Build a tree of direct children for a given term. A child is a term whose parent is this term.
 */
function buildChildMap(parentMap) {
  const childMap = new Map();
  for (const [termId, parentId] of parentMap) {
    if (!childMap.has(parentId)) childMap.set(parentId, []);
    childMap.get(parentId).push(termId);
  }
  return childMap;
}

/**
 * Build nested tree structure for a root class: { id, name, subclasses: [...] }
 */
function buildSubclassTree(rootId, terms, childMap) {
  const term = terms.get(rootId);
  const node = {
    id: rootId,
    name: term ? term.name : rootId,
    subclasses: [],
  };

  const children = childMap.get(rootId) || [];
  for (const childId of children) {
    node.subclasses.push(buildSubclassTree(childId, terms, childMap));
  }

  node.subclasses.sort((a, b) => a.name.localeCompare(b.name));
  return node;
}

/**
 * Parse OBO and return the four main classes present in the file
 */
function parseMainClasses(oboContent) {
  const found = new Set();
  const lines = oboContent.split("\n");
  for (const line of lines) {
    const match = line.match(/^is_a:\s*(?:ns\d+:)?([A-Za-z_]+)/);
    if (match && MAIN_CLASSES.includes(match[1])) found.add(match[1]);
  }
  return Array.from(found).sort();
}

/**
 * Parse OBO and return full subclass hierarchy for a given main class
 */
function parseSubclassHierarchy(oboContent, className) {
  if (!MAIN_CLASSES.includes(className)) {
    return null;
  }

  const terms = parseTerms(oboContent);
  const parentMap = buildParentMap(terms);
  const childMap = buildChildMap(parentMap);

  return buildSubclassTree(className, terms, childMap);
}

module.exports = {
  MAIN_CLASSES,
  parseMainClasses,
  parseSubclassHierarchy,
};
