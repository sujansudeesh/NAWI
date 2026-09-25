import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
  QuerySnapshot
} from "firebase/firestore";
import { 
  ref, 
  set, 
  get, 
  child, 
  push, 
  update, 
  remove, 
  onValue,
  DataSnapshot
} from "firebase/database";
import { db, rtdb } from "../lib/firebase";

/**
 * Firebase Firestore Database Helpers (Document Store)
 */
export const firestoreService = {
  // Create or overwrite a document in a collection with custom ID
  async setDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  },

  // Add a new document to a collection with auto-generated ID
  async addDocument(collectionName: string, data: any): Promise<string> {
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, { 
      ...data, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString() 
    });
    return docRef.id;
  },

  // Fetch a single document by ID
  async getDocument<T = DocumentData>(collectionName: string, docId: string): Promise<T | null> {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  },

  // Fetch all documents in a collection
  async getCollection<T = DocumentData>(collectionName: string): Promise<T[]> {
    const colRef = collection(db, collectionName);
    const querySnapshot = await getDocs(colRef);
    const results: T[] = [];
    querySnapshot.forEach((docItem: QueryDocumentSnapshot<DocumentData>) => {
      results.push({ id: docItem.id, ...docItem.data() } as T);
    });
    return results;
  },

  // Query documents by field equality
  async queryCollection<T = DocumentData>(collectionName: string, field: string, value: any): Promise<T[]> {
    const colRef = collection(db, collectionName);
    const q = query(colRef, where(field, "==", value));
    const querySnapshot = await getDocs(q);
    const results: T[] = [];
    querySnapshot.forEach((docItem: QueryDocumentSnapshot<DocumentData>) => {
      results.push({ id: docItem.id, ...docItem.data() } as T);
    });
    return results;
  },

  // Update specific fields of a document
  async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
  },

  // Delete a document
  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  },

  // Realtime subscription to collection changes
  subscribeToCollection<T = DocumentData>(collectionName: string, callback: (data: T[]) => void): () => void {
    const colRef = collection(db, collectionName);
    return onSnapshot(colRef, (snapshot: QuerySnapshot<DocumentData>) => {
      const items: T[] = [];
      snapshot.forEach((docItem: QueryDocumentSnapshot<DocumentData>) => {
        items.push({ id: docItem.id, ...docItem.data() } as T);
      });
      callback(items);
    });
  }
};

/**
 * Firebase Realtime Database Helpers (Key-Value / JSON Tree Store)
 */
export const realtimeDbService = {
  // Set data at a specific path
  async setPath(path: string, data: any): Promise<void> {
    const dbRef = ref(rtdb, path);
    await set(dbRef, data);
  },

  // Push new item to a path list
  async pushPath(path: string, data: any): Promise<string> {
    const dbRef = ref(rtdb, path);
    const newRef = push(dbRef);
    await set(newRef, data);
    return newRef.key || '';
  },

  // Read data from a path
  async getPath<T = any>(path: string): Promise<T | null> {
    const dbRef = ref(rtdb);
    const snapshot = await get(child(dbRef, path));
    if (snapshot.exists()) {
      return snapshot.val() as T;
    }
    return null;
  },

  // Update specific keys at a path
  async updatePath(path: string, data: any): Promise<void> {
    const dbRef = ref(rtdb, path);
    await update(dbRef, data);
  },

  // Delete node at path
  async removePath(path: string): Promise<void> {
    const dbRef = ref(rtdb, path);
    await remove(dbRef);
  },

  // Subscribe to realtime value updates at path
  subscribeToPath<T = any>(path: string, callback: (data: T | null) => void): () => void {
    const dbRef = ref(rtdb, path);
    return onValue(dbRef, (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as T);
      } else {
        callback(null);
      }
    });
  }
};
