type HoverExitEventType =
  | "mouseleave"
  | "mouseout"
  | "pointerleave"
  | "pointerout";

type OwnedExternalElementSnapshot = {
  ariaHidden: string | null;
  display: string;
  displayPriority: string;
  inert: boolean;
};

type RouteTransientUiState = {
  hiddenElements: Map<HTMLElement, OwnedExternalElementSnapshot>;
  ownedElements: Set<HTMLElement>;
};

type DocumentTransientUiState = {
  observer: MutationObserver | null;
  ownerByElement: WeakMap<HTMLElement, string>;
  routes: Map<string, RouteTransientUiState>;
  visiblePathname: string | null;
};

const documentStates = new WeakMap<Document, DocumentTransientUiState>();
const PERSISTENT_EXTERNAL_ATTRIBUTE = "data-router-cache-persistent-external";

function isBlurTarget(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement;
}

function getOrCreateDocumentState(
  documentObject: Document
): DocumentTransientUiState {
  const existingState = documentStates.get(documentObject);

  if (existingState) {
    return existingState;
  }

  const state: DocumentTransientUiState = {
    observer: null,
    ownerByElement: new WeakMap(),
    routes: new Map(),
    visiblePathname: null,
  };

  if (typeof MutationObserver !== "undefined") {
    state.observer = new MutationObserver((mutations) => {
      handleDomMutations(mutations, state);
    });

    state.observer.observe(
      documentObject.body ?? documentObject.documentElement,
      {
        childList: true,
        subtree: true,
      }
    );
  }

  documentStates.set(documentObject, state);

  return state;
}

function getOrCreateRouteState(
  state: DocumentTransientUiState,
  pathname: string
): RouteTransientUiState {
  const existingRouteState = state.routes.get(pathname);

  if (existingRouteState) {
    return existingRouteState;
  }

  const routeState: RouteTransientUiState = {
    hiddenElements: new Map(),
    ownedElements: new Set(),
  };

  state.routes.set(pathname, routeState);

  return routeState;
}

function getHoveredElements(documentObject: Document) {
  try {
    return Array.from(documentObject.querySelectorAll(":hover")).reverse();
  } catch {
    return [];
  }
}

function getOwnedExternalElements(documentObject: Document, pathname: string) {
  const documentState = getOrCreateDocumentState(documentObject);
  const routeState = getOrCreateRouteState(documentState, pathname);

  return Array.from(routeState.ownedElements).filter(
    (element) => element.isConnected
  );
}

function dispatchEscapeKeyboardEvent(
  target: Document,
  documentObject: Document,
  type: "keydown" | "keyup"
) {
  const keyboardEventConstructor =
    documentObject.defaultView?.KeyboardEvent ?? KeyboardEvent;

  target.dispatchEvent(
    new keyboardEventConstructor(type, {
      bubbles: true,
      cancelable: true,
      code: "Escape",
      key: "Escape",
      keyCode: 27,
      which: 27,
    })
  );
}

function dispatchHoverExitEvent(
  target: Element,
  documentObject: Document,
  type: HoverExitEventType
) {
  const isPointerEvent = type.startsWith("pointer");
  const eventConstructor = isPointerEvent
    ? (documentObject.defaultView?.PointerEvent ??
      documentObject.defaultView?.MouseEvent ??
      MouseEvent)
    : (documentObject.defaultView?.MouseEvent ?? MouseEvent);

  target.dispatchEvent(
    new eventConstructor(type, {
      bubbles: type.endsWith("out"),
      cancelable: true,
      composed: true,
      relatedTarget: documentObject.body,
    })
  );
}

function dispatchHoverExitEvents(
  hoveredElements: Element[],
  documentObject: Document
) {
  for (const hoveredElement of hoveredElements) {
    dispatchHoverExitEvent(hoveredElement, documentObject, "pointerout");
    dispatchHoverExitEvent(hoveredElement, documentObject, "pointerleave");
    dispatchHoverExitEvent(hoveredElement, documentObject, "mouseout");
    dispatchHoverExitEvent(hoveredElement, documentObject, "mouseleave");
  }
}

function focusDocumentBody(documentObject: Document) {
  const { body } = documentObject;
  const previousTabIndex = body.getAttribute("tabindex");

  if (previousTabIndex === null) {
    body.setAttribute("tabindex", "-1");
  }

  body.focus();

  if (previousTabIndex === null) {
    body.removeAttribute("tabindex");
  }
}

function getRouterCacheContainerAncestor(element: Element | null) {
  const container = element?.closest('[data-router-cache-container="true"]');

  return container instanceof HTMLElement ? container : null;
}

function isElementInsideAnyRouterCacheContainer(element: Element) {
  return getRouterCacheContainerAncestor(element) !== null;
}

function containsRouterCacheContainer(element: Element) {
  return (
    element.querySelector('[data-router-cache-container="true"]') instanceof
    HTMLElement
  );
}

function isElementConnectedOutsideRouterCacheContainer(element: HTMLElement) {
  return (
    element.isConnected && !isElementInsideAnyRouterCacheContainer(element)
  );
}

function isPersistentExternalElement(element: HTMLElement) {
  return (
    element.closest(`[${PERSISTENT_EXTERNAL_ATTRIBUTE}="true"]`) instanceof
    HTMLElement
  );
}

function getTrackableElementsFromNode(node: Node): HTMLElement[] {
  if (node instanceof HTMLElement) {
    return [node];
  }

  if (node instanceof DocumentFragment) {
    return Array.from(node.children).flatMap((child) =>
      child instanceof HTMLElement ? [child] : []
    );
  }

  return [];
}

function forEachRemovedNode(
  mutations: MutationRecord[],
  callback: (removedNode: Node) => void
) {
  for (const mutation of mutations) {
    for (const removedNode of mutation.removedNodes) {
      callback(removedNode);
    }
  }
}

function forEachAddedNode(
  mutations: MutationRecord[],
  callback: (addedNode: Node) => void
) {
  for (const mutation of mutations) {
    for (const addedNode of mutation.addedNodes) {
      callback(addedNode);
    }
  }
}

function handleDomMutations(
  mutations: MutationRecord[],
  state: DocumentTransientUiState
) {
  forEachRemovedNode(mutations, (removedNode) => {
    untrackRemovedNode(removedNode, state);
  });

  if (!state.visiblePathname) {
    return;
  }

  forEachAddedNode(mutations, (addedNode) => {
    trackAddedNode(addedNode, state.visiblePathname as string, state);
  });
}

function hasTrackedAncestor(
  element: HTMLElement,
  state: DocumentTransientUiState
) {
  let ancestor = element.parentElement;

  while (ancestor) {
    if (state.ownerByElement.get(ancestor)) {
      return true;
    }

    ancestor = ancestor.parentElement;
  }

  return false;
}

function restoreOwnedExternalElement(
  routeState: RouteTransientUiState,
  element: HTMLElement
) {
  const snapshot = routeState.hiddenElements.get(element);

  if (!snapshot) {
    return;
  }

  element.style.setProperty(
    "display",
    snapshot.display,
    snapshot.displayPriority
  );

  if (snapshot.ariaHidden === null) {
    element.removeAttribute("aria-hidden");
  } else {
    element.setAttribute("aria-hidden", snapshot.ariaHidden);
  }

  element.inert = snapshot.inert;
  routeState.hiddenElements.delete(element);
}

function trackExternalElement(
  pathname: string,
  element: HTMLElement,
  state: DocumentTransientUiState
) {
  if (
    !isElementConnectedOutsideRouterCacheContainer(element) ||
    containsRouterCacheContainer(element) ||
    isPersistentExternalElement(element) ||
    hasTrackedAncestor(element, state)
  ) {
    return;
  }

  const currentOwner = state.ownerByElement.get(element);

  if (currentOwner === pathname) {
    return;
  }

  if (currentOwner) {
    const previousRouteState = state.routes.get(currentOwner);

    if (previousRouteState) {
      restoreOwnedExternalElement(previousRouteState, element);
      previousRouteState.ownedElements.delete(element);
    }
  }

  const routeState = getOrCreateRouteState(state, pathname);
  routeState.ownedElements.add(element);
  state.ownerByElement.set(element, pathname);
}

function trackAddedNode(
  node: Node,
  pathname: string,
  state: DocumentTransientUiState
) {
  const elements = getTrackableElementsFromNode(node);

  for (const element of elements) {
    trackExternalElement(pathname, element, state);
  }
}

function untrackElement(
  routeState: RouteTransientUiState,
  state: DocumentTransientUiState,
  element: HTMLElement
) {
  routeState.hiddenElements.delete(element);
  routeState.ownedElements.delete(element);
  state.ownerByElement.delete(element);
}

function untrackRemovedNode(node: Node, state: DocumentTransientUiState) {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  for (const routeState of state.routes.values()) {
    for (const element of Array.from(routeState.ownedElements)) {
      if (node === element || node.contains(element)) {
        untrackElement(routeState, state, element);
      }
    }
  }
}

function hideOwnedExternalElements(documentObject: Document, pathname: string) {
  const routeState = getOrCreateRouteState(
    getOrCreateDocumentState(documentObject),
    pathname
  );

  for (const element of Array.from(routeState.ownedElements)) {
    if (!isElementConnectedOutsideRouterCacheContainer(element)) {
      routeState.ownedElements.delete(element);
      routeState.hiddenElements.delete(element);
      continue;
    }

    if (routeState.hiddenElements.has(element)) {
      continue;
    }

    routeState.hiddenElements.set(element, {
      ariaHidden: element.getAttribute("aria-hidden"),
      display: element.style.getPropertyValue("display"),
      displayPriority: element.style.getPropertyPriority("display"),
      inert: element.inert,
    });

    element.style.setProperty("display", "none", "important");
    element.setAttribute("aria-hidden", "true");
    element.inert = true;
  }
}

function showOwnedExternalElements(documentObject: Document, pathname: string) {
  const routeState = getOrCreateRouteState(
    getOrCreateDocumentState(documentObject),
    pathname
  );

  for (const [element] of Array.from(routeState.hiddenElements)) {
    if (!element.isConnected) {
      routeState.hiddenElements.delete(element);
      routeState.ownedElements.delete(element);
      continue;
    }

    restoreOwnedExternalElement(routeState, element);
  }
}

export function initializeTransientUiTracking(documentObject: Document) {
  getOrCreateDocumentState(documentObject);
}

export function syncTransientUiRouteActivity(
  pathname: string,
  mode: "hidden" | "visible"
) {
  if (typeof document === "undefined") {
    return;
  }

  const documentState = getOrCreateDocumentState(document);
  getOrCreateRouteState(documentState, pathname);

  if (mode === "visible") {
    documentState.visiblePathname = pathname;
    showOwnedExternalElements(document, pathname);
    return;
  }

  if (documentState.visiblePathname === pathname) {
    documentState.visiblePathname = null;
  }

  dispatchHoverExitEvents(
    getOwnedExternalElements(document, pathname),
    document
  );
  hideOwnedExternalElements(document, pathname);
}

export function dismissTransientUi(
  container: HTMLElement | null,
  pathname: string
) {
  if (typeof document === "undefined" || !container) {
    return;
  }

  initializeTransientUiTracking(document);

  const hoveredElements = getHoveredElements(document);
  const hoverExitTargets = Array.from(
    new Set([
      ...hoveredElements,
      ...getOwnedExternalElements(document, pathname),
    ])
  );
  const activeElement = document.activeElement;
  const activeElementBelongsToHoveredTree =
    activeElement instanceof Element &&
    hoverExitTargets.some(
      (hoveredElement) =>
        hoveredElement === activeElement ||
        hoveredElement.contains(activeElement)
    );

  if (
    activeElement instanceof Element &&
    (container.contains(activeElement) || activeElementBelongsToHoveredTree) &&
    isBlurTarget(activeElement)
  ) {
    activeElement.blur();
  }

  dispatchHoverExitEvents(hoverExitTargets, document);
  dispatchEscapeKeyboardEvent(document, document, "keydown");
  dispatchEscapeKeyboardEvent(document, document, "keyup");
  hideOwnedExternalElements(document, pathname);

  const nextActiveElement = document.activeElement;
  const nextActiveElementBelongsToHoveredTree =
    nextActiveElement instanceof Element &&
    hoverExitTargets.some(
      (hoveredElement) =>
        hoveredElement === nextActiveElement ||
        hoveredElement.contains(nextActiveElement)
    );

  if (
    nextActiveElement instanceof Element &&
    (container.contains(nextActiveElement) ||
      nextActiveElementBelongsToHoveredTree)
  ) {
    focusDocumentBody(document);
  }
}
