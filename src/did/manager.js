export async function clear(store) {
  if (store){
    store.clear();
  }
}

export async function exists(id, store) {
  const value = await store.get(id);
  return value !== undefined;
}

export async function get(id, store) {
  return store.get(id);
}

export async function remove(id, store) {
  store.remove(id);
}

export async function set(id, value, store) {
  store.set(id, value);
}