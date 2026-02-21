import type { JsonValue, NodeType, TreeNode, TreeState } from "./types";
import { fromJson, toJson } from "./tree";

function applyToJson(
  state: TreeState,
  mutate: (json: JsonValue) => JsonValue,
): TreeState {
  const json = toJson(state.root);
  return fromJson(mutate(json));
}

function getAtPath(obj: JsonValue, segments: string[]): JsonValue | undefined {
  let current: JsonValue = obj;
  for (const seg of segments) {
    if (current === null || typeof current !== "object") return undefined;
    if (Array.isArray(current)) {
      current = current[Number(seg)];
    } else {
      current = (current as Record<string, JsonValue>)[seg];
    }
  }
  return current;
}

function pathSegments(node: TreeNode): string[] {
  return node.path.split("/").filter(Boolean);
}

export function setValue(
  state: TreeState,
  nodeId: string,
  value: JsonValue,
): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node) return state;

  return applyToJson(state, (json) => {
    const segments = pathSegments(node);
    if (segments.length === 0) return value;

    const clone = structuredClone(json);
    const parentSegments = segments.slice(0, -1);
    const lastKey = segments[segments.length - 1];
    const parent =
      parentSegments.length === 0 ? clone : getAtPath(clone, parentSegments);

    if (parent !== null && typeof parent === "object") {
      if (Array.isArray(parent)) {
        parent[Number(lastKey)] = value;
      } else {
        (parent as Record<string, JsonValue>)[lastKey] = value;
      }
    }

    return clone;
  });
}

export function setKey(
  state: TreeState,
  nodeId: string,
  newKey: string,
): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node || !node.parentId) return state;

  const parent = state.nodesById.get(node.parentId);
  if (!parent || parent.type !== "object") return state;

  return applyToJson(state, (json) => {
    const clone = structuredClone(json);
    const parentSegments = pathSegments(parent);
    const parentObj =
      parentSegments.length === 0 ? clone : getAtPath(clone, parentSegments);

    if (
      parentObj !== null &&
      typeof parentObj === "object" &&
      !Array.isArray(parentObj)
    ) {
      const obj = parentObj as Record<string, JsonValue>;
      const oldKey = node.key;
      const entries = Object.entries(obj);
      const newEntries = entries.map(([k, v]) =>
        k === oldKey ? [newKey, v] : [k, v],
      );
      for (const key of Object.keys(obj)) delete obj[key];
      for (const [k, v] of newEntries) obj[k as string] = v as JsonValue;
    }

    return clone;
  });
}

export function addProperty(
  state: TreeState,
  parentId: string,
  key: string,
  value: JsonValue,
): TreeState {
  const parent = state.nodesById.get(parentId);
  if (!parent) return state;

  return applyToJson(state, (json) => {
    const clone = structuredClone(json);
    const segments = pathSegments(parent);
    const target = segments.length === 0 ? clone : getAtPath(clone, segments);

    if (target !== null && typeof target === "object") {
      if (Array.isArray(target)) {
        target.push(value);
      } else {
        (target as Record<string, JsonValue>)[key] = value;
      }
    }

    return clone;
  });
}

export function removeNode(state: TreeState, nodeId: string): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node || !node.parentId) return state;

  const parent = state.nodesById.get(node.parentId);
  if (!parent) return state;

  return applyToJson(state, (json) => {
    const clone = structuredClone(json);
    const parentSegments = pathSegments(parent);
    const target =
      parentSegments.length === 0 ? clone : getAtPath(clone, parentSegments);

    if (target !== null && typeof target === "object") {
      if (Array.isArray(target)) {
        target.splice(Number(node.key), 1);
      } else {
        delete (target as Record<string, JsonValue>)[node.key];
      }
    }

    return clone;
  });
}

export function moveNode(
  state: TreeState,
  nodeId: string,
  newParentId: string,
  index?: number,
): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node || !node.parentId) return state;

  const srcParent = state.nodesById.get(node.parentId);
  const dstParent = state.nodesById.get(newParentId);
  if (!srcParent || !dstParent) return state;

  const nodeValue = toJson(node);

  return applyToJson(state, (json) => {
    const clone = structuredClone(json);

    const srcSegs = pathSegments(srcParent);
    const src = srcSegs.length === 0 ? clone : getAtPath(clone, srcSegs);
    if (src !== null && typeof src === "object") {
      if (Array.isArray(src)) {
        src.splice(Number(node.key), 1);
      } else {
        delete (src as Record<string, JsonValue>)[node.key];
      }
    }

    let dstSegs = pathSegments(dstParent);
    if (srcParent.type === "array") {
      const removedIdx = Number(node.key);
      const prefixLen = srcSegs.length;
      if (
        dstSegs.length > prefixLen &&
        dstSegs.slice(0, prefixLen).every((s, i) => s === srcSegs[i])
      ) {
        const throughIdx = Number(dstSegs[prefixLen]);
        if (!isNaN(throughIdx) && throughIdx > removedIdx) {
          dstSegs = [...dstSegs];
          dstSegs[prefixLen] = String(throughIdx - 1);
        }
      }
    }

    const dst = dstSegs.length === 0 ? clone : getAtPath(clone, dstSegs);
    if (dst !== null && typeof dst === "object") {
      if (Array.isArray(dst)) {
        const insertAt = index ?? dst.length;
        dst.splice(insertAt, 0, nodeValue);
      } else {
        const obj = dst as Record<string, JsonValue>;
        const entries = Object.entries(obj);
        const insertAt = index ?? entries.length;
        entries.splice(insertAt, 0, [node.key, nodeValue]);
        for (const key of Object.keys(obj)) delete obj[key];
        for (const [k, v] of entries) obj[k] = v;
      }
    }

    return clone;
  });
}

export function reorderChildren(
  state: TreeState,
  parentId: string,
  fromIndex: number,
  toIndex: number,
): TreeState {
  const parent = state.nodesById.get(parentId);
  if (!parent) return state;

  return applyToJson(state, (json) => {
    const clone = structuredClone(json);
    const segments = pathSegments(parent);
    const target = segments.length === 0 ? clone : getAtPath(clone, segments);

    if (target !== null && typeof target === "object") {
      if (Array.isArray(target)) {
        const [item] = target.splice(fromIndex, 1);
        target.splice(toIndex, 0, item);
      } else {
        const obj = target as Record<string, JsonValue>;
        const entries = Object.entries(obj);
        const [item] = entries.splice(fromIndex, 1);
        entries.splice(toIndex, 0, item);
        for (const key of Object.keys(obj)) delete obj[key];
        for (const [k, v] of entries) obj[k] = v;
      }
    }

    return clone;
  });
}

export function getNodeType(value: JsonValue): NodeType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as NodeType;
}

function convertValue(current: JsonValue, newType: NodeType): JsonValue {
  switch (newType) {
    case "string":
      if (current === null || current === undefined) return "";
      if (typeof current === "object") return JSON.stringify(current);
      return String(current);
    case "number": {
      const n = Number(current);
      return isNaN(n) ? 0 : n;
    }
    case "boolean":
      return Boolean(current);
    case "null":
      return null;
    case "object":
      if (
        current !== null &&
        typeof current === "object" &&
        !Array.isArray(current)
      )
        return current;
      if (Array.isArray(current)) {
        const obj: Record<string, JsonValue> = {};
        current.forEach((item, i) => {
          obj[String(i)] = item;
        });
        return obj;
      }
      return {};
    case "array":
      if (Array.isArray(current)) return current;
      if (current !== null && typeof current === "object")
        return Object.values(current);
      return current === null || current === undefined ? [] : [current];
    default:
      return current;
  }
}

export function changeType(
  state: TreeState,
  nodeId: string,
  newType: NodeType,
): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node) return state;

  const currentValue = toJson(node);
  const newValue = convertValue(currentValue, newType);
  return setValue(state, nodeId, newValue);
}

export function duplicateNode(state: TreeState, nodeId: string): TreeState {
  const node = state.nodesById.get(nodeId);
  if (!node || !node.parentId) return state;

  const parent = state.nodesById.get(node.parentId);
  if (!parent) return state;

  const nodeValue = toJson(node);

  return applyToJson(state, (json) => {
    const clone = structuredClone(json);
    const parentSegments = pathSegments(parent);
    const target =
      parentSegments.length === 0 ? clone : getAtPath(clone, parentSegments);

    if (target !== null && typeof target === "object") {
      if (Array.isArray(target)) {
        const idx = Number(node.key);
        target.splice(idx + 1, 0, structuredClone(nodeValue));
      } else {
        const obj = target as Record<string, JsonValue>;
        const entries = Object.entries(obj);
        const idx = entries.findIndex(([k]) => k === node.key);
        const newKey = `${node.key}_copy`;
        entries.splice(idx + 1, 0, [newKey, structuredClone(nodeValue)]);
        for (const key of Object.keys(obj)) delete obj[key];
        for (const [k, v] of entries) obj[k] = v;
      }
    }

    return clone;
  });
}
