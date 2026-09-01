import { db, testFirestoreConnection } from './firebase.ts';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Opportunity, Application, Student, Category, Skill } from '../types.ts';

export interface FirebaseStatusInfo {
  isConnected: boolean;
  projectId: string;
  databaseId: string;
  authDomain: string;
  collections: {
    opportunitiesCount: number;
    studentsCount: number;
    applicationsCount: number;
    categoriesCount: number;
    skillsCount: number;
  };
  lastSyncedAt?: string;
  error?: string | null;
}

// Get live status of Firebase Firestore
export async function getFirebaseStatus(): Promise<FirebaseStatusInfo> {
  const isConnected = await testFirestoreConnection();
  
  const status: FirebaseStatusInfo = {
    isConnected,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    authDomain: firebaseConfig.authDomain,
    collections: {
      opportunitiesCount: 0,
      studentsCount: 0,
      applicationsCount: 0,
      categoriesCount: 0,
      skillsCount: 0,
    }
  };

  if (isConnected) {
    try {
      const [oppSnap, stuSnap, appSnap, catSnap, skSnap] = await Promise.allSettled([
        getDocs(collection(db, 'opportunities')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'applications')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'skills')),
      ]);

      if (oppSnap.status === 'fulfilled') status.collections.opportunitiesCount = oppSnap.value.size;
      if (stuSnap.status === 'fulfilled') status.collections.studentsCount = stuSnap.value.size;
      if (appSnap.status === 'fulfilled') status.collections.applicationsCount = appSnap.value.size;
      if (catSnap.status === 'fulfilled') status.collections.categoriesCount = catSnap.value.size;
      if (skSnap.status === 'fulfilled') status.collections.skillsCount = skSnap.value.size;
    } catch (err: any) {
      console.warn('Error reading collection counts from Firestore:', err);
      status.error = err?.message;
    }
  }

  return status;
}

// Seed / Sync Data to Firestore Cloud
export async function syncDataToFirestore(data: {
  categories?: Category[];
  skills?: Skill[];
  students?: Student[];
  opportunities?: Opportunity[];
  applications?: Application[];
}): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    let syncedCount = 0;

    // 1. Categories
    if (data.categories && data.categories.length > 0) {
      for (const cat of data.categories) {
        await setDoc(doc(db, 'categories', cat.category_id), {
          ...cat,
          _updatedAt: serverTimestamp()
        }, { merge: true });
        syncedCount++;
      }
    }

    // 2. Skills
    if (data.skills && data.skills.length > 0) {
      for (const sk of data.skills) {
        await setDoc(doc(db, 'skills', sk.skill_id), {
          ...sk,
          _updatedAt: serverTimestamp()
        }, { merge: true });
        syncedCount++;
      }
    }

    // 3. Students
    if (data.students && data.students.length > 0) {
      for (const stu of data.students) {
        await setDoc(doc(db, 'students', stu.student_id), {
          ...stu,
          _updatedAt: serverTimestamp()
        }, { merge: true });
        syncedCount++;
      }
    }

    // 4. Opportunities
    if (data.opportunities && data.opportunities.length > 0) {
      for (const opp of data.opportunities) {
        await setDoc(doc(db, 'opportunities', opp.opportunity_id), {
          ...opp,
          _updatedAt: serverTimestamp()
        }, { merge: true });
        syncedCount++;
      }
    }

    // 5. Applications
    if (data.applications && data.applications.length > 0) {
      for (const app of data.applications) {
        await setDoc(doc(db, 'applications', app.application_id), {
          ...app,
          _updatedAt: serverTimestamp()
        }, { merge: true });
        syncedCount++;
      }
    }

    return { success: true, syncedCount };
  } catch (error: any) {
    console.error('Failed to sync data to Firestore:', error);
    return { success: false, syncedCount: 0, error: error?.message || 'Gagal menyimpan ke Firestore' };
  }
}
