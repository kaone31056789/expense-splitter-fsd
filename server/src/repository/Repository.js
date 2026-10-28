/**
 * A tiny in-memory "table" (the app's database, like H2 in-memory: data is lost on restart).
 * Every repository gets save / findById / findAll / delete / count for free,
 * and ids are generated like an IDENTITY column (1, 2, 3 ...).
 */
let currentTransaction = null;

export class Repository {
  #rows = new Map();
  #nextId = 1;

  save(entity) {
    if (entity.id == null) {
      entity.id = this.#nextId++;
    }
    const isNew = !this.#rows.has(entity.id);
    this.#rows.set(entity.id, entity);
    if (isNew && currentTransaction) {
      currentTransaction.push(() => this.#rows.delete(entity.id));
    }
    return entity;
  }

  findById(id) {
    return this.#rows.get(id) ?? null;
  }

  // Rows in insertion (id) order
  findAll() {
    return [...this.#rows.values()];
  }

  delete(entity) {
    if (this.#rows.delete(entity.id) && currentTransaction) {
      currentTransaction.push(() => this.#rows.set(entity.id, entity));
    }
  }

  deleteAll(entities) {
    entities.forEach((e) => this.delete(e));
  }

  count() {
    return this.#rows.size;
  }

  // Used by the database snapshot: replace every row and the id counter
  replaceAll(rows, nextId) {
    this.#rows = new Map(rows.map((r) => [r.id, r]));
    this.#nextId = nextId;
  }

  get nextId() {
    return this.#nextId;
  }
}

/**
 * Runs fn as ONE unit of work. If it throws, every row it inserted or deleted is put back,
 * so no half-saved data is left behind (like @Transactional rollback).
 * As with a real IDENTITY column, ids used by the rolled-back rows are not reused.
 */
export function transactional(fn) {
  if (currentTransaction) {
    return fn(); // already inside a transaction: join it
  }
  currentTransaction = [];
  try {
    return fn();
  } catch (err) {
    currentTransaction.reverse().forEach((undo) => undo());
    throw err;
  } finally {
    currentTransaction = null;
  }
}
