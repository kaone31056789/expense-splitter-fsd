/**
 * Binary heap priority queue (same algorithm as java.util.PriorityQueue).
 * compare(a, b) < 0 means a comes out first.
 */
export class PriorityQueue {
  #heap = [];

  constructor(compare) {
    this.compare = compare;
  }

  get size() {
    return this.#heap.length;
  }

  isEmpty() {
    return this.#heap.length === 0;
  }

  // Add at the bottom, then move up while it beats its parent
  add(item) {
    const heap = this.#heap;
    let k = heap.length;
    heap.push(item);
    while (k > 0) {
      const parent = (k - 1) >>> 1;
      if (this.compare(item, heap[parent]) >= 0) break;
      heap[k] = heap[parent];
      k = parent;
    }
    heap[k] = item;
  }

  // Take the top, move the last item to the top, then move it down
  poll() {
    const heap = this.#heap;
    if (heap.length === 0) return null;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      let k = 0;
      const half = heap.length >>> 1;
      while (k < half) {
        let child = 2 * k + 1;
        const right = child + 1;
        if (right < heap.length && this.compare(heap[child], heap[right]) > 0) child = right;
        if (this.compare(last, heap[child]) <= 0) break;
        heap[k] = heap[child];
        k = child;
      }
      heap[k] = last;
    }
    return top;
  }
}
