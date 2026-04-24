const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

const USER_ID = "SherilTMario_29072005";
const EMAIL_ID = "st4494@srmist.edu.in";
const ROLL_NUMBER = "RA2311026011014";

function isValidEdge(edge) {
  if (typeof edge !== "string") return false;
  const trimmed = edge.trim();
  return /^[A-Z]->[A-Z]$/.test(trimmed) && trimmed[0] !== trimmed[3];
}

app.post("/bfhl", (req, res) => {
  const data = Array.isArray(req.body.data) ? req.body.data : [];

  const invalidEntries = [];
  const duplicateEdges = [];
  const duplicateSet = new Set();
  const seenEdges = new Set();
  const validEdges = [];

  for (const item of data) {
    if (!isValidEdge(item)) {
      invalidEntries.push(item);
      continue;
    }

    const edge = item.trim();

    if (seenEdges.has(edge)) {
      if (!duplicateSet.has(edge)) {
        duplicateEdges.push(edge);
        duplicateSet.add(edge);
      }
      continue;
    }

    seenEdges.add(edge);
    validEdges.push(edge);
  }

  const graph = {};
  const nodes = new Set();
  const childToParent = new Map();

  for (const edge of validEdges) {
    const [parent, child] = edge.split("->");

    nodes.add(parent);
    nodes.add(child);

    // Multi-parent rule: first parent wins
    if (childToParent.has(child)) continue;

    childToParent.set(child, parent);

    if (!graph[parent]) graph[parent] = [];
    graph[parent].push(child);
  }

  const visited = new Set();
  const hierarchies = [];

  function getComponent(start) {
    const stack = [start];
    const component = new Set();

    while (stack.length > 0) {
      const node = stack.pop();
      if (component.has(node)) continue;

      component.add(node);

      for (const child of graph[node] || []) {
        stack.push(child);
      }

      for (const [child, parent] of childToParent.entries()) {
        if (child === node) stack.push(parent);
      }
    }

    return component;
  }

  function hasCycle(node, visiting, visitedCycle) {
    if (visiting.has(node)) return true;
    if (visitedCycle.has(node)) return false;

    visiting.add(node);

    for (const child of graph[node] || []) {
      if (hasCycle(child, visiting, visitedCycle)) return true;
    }

    visiting.delete(node);
    visitedCycle.add(node);
    return false;
  }

  function buildTree(node) {
    const tree = {};

    for (const child of graph[node] || []) {
      tree[child] = buildTree(child);
    }

    return tree;
  }

  function calculateDepth(node) {
    const children = graph[node] || [];

    if (children.length === 0) return 1;

    return 1 + Math.max(...children.map(calculateDepth));
  }

  const sortedNodes = [...nodes].sort();

  for (const node of sortedNodes) {
    if (visited.has(node)) continue;

    const component = getComponent(node);
    for (const n of component) visited.add(n);

    const componentNodes = [...component].sort();

    const roots = componentNodes.filter(n => !childToParent.has(n));
    const root = roots.length > 0 ? roots[0] : componentNodes[0];

    const cycleFound = hasCycle(root, new Set(), new Set());

    if (cycleFound) {
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true
      });
    } else {
      hierarchies.push({
        root,
        tree: {
          [root]: buildTree(root)
        },
        depth: calculateDepth(root)
      });
    }
  }

  const nonCyclicTrees = hierarchies.filter(h => !h.has_cycle);
  const cyclicTrees = hierarchies.filter(h => h.has_cycle);

  let largestTreeRoot = "";

  if (nonCyclicTrees.length > 0) {
    nonCyclicTrees.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root.localeCompare(b.root);
    });

    largestTreeRoot = nonCyclicTrees[0].root;
  }

  res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: nonCyclicTrees.length,
      total_cycles: cyclicTrees.length,
      largest_tree_root: largestTreeRoot
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});