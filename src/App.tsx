/**
 * ShasthoNote AI — Intelligent Health Documentation & Knowledge Workspace
 */

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, googleProvider, testConnection } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import {
  Language,
  WorkspaceMode,
  HealthNote,
  SourceDocument,
  Appointment,
  UserProfile,
  StudyResource,
  VitalReading,
  Medication,
} from './types';
import {
  INITIAL_HEALTH_NOTES,
  INITIAL_DOCUMENTS,
  INITIAL_APPOINTMENTS,
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { NoteCreatorView } from './components/NoteCreatorView';
import { DocumentAnalyzerView } from './components/DocumentAnalyzerView';
import { ResearchStudioView } from './components/ResearchStudioView';
import { MindMapView } from './components/MindMapView';
import { StudyStudioView } from './components/StudyStudioView';
import { AudioOverviewView } from './components/AudioOverviewView';
import { NearbyCareView } from './components/NearbyCareView';
import { HealthTimelineView } from './components/HealthTimelineView';
import { AppointmentsView } from './components/AppointmentsView';
import { ExportCenterView } from './components/ExportCenterView';
import { EmergencyModal } from './components/EmergencyModal';
import { VitalsTrackerView } from './components/VitalsTrackerView';
import { MedicationsView } from './components/MedicationsView';
import { LabTrendsView } from './components/LabTrendsView';
import { VisitPackView } from './components/VisitPackView';
import { PrivacyCenterView, type ImportOutcome } from './components/PrivacyCenterView';
import { AskRecordsView } from './components/AskRecordsView';
import { CommandPalette } from './components/CommandPalette';
import { ConsentModal } from './components/ConsentModal';
import { TodayPanel } from './components/TodayPanel';
import { HealthInsightsView } from './components/HealthInsightsView';
import { getAiConsentState, setAiConsent, type AiConsentState } from './lib/consent';
import { deleteAllOwnedRecords, deleteOwnedRecord, loadOwnedRecords, saveOwnedRecord, type OwnedCollection } from './lib/records';
import { downloadTextFile } from './lib/download';
import { decryptBackupText, encryptBackupText, isEncryptedBackupText } from './utils/secureBackup';
import { assignOwner, buildBackupBundle, countBackupData, parseBackupBundle, type BackupData } from './utils/backup';
import type { SearchHit } from './utils/search';

const GUEST_UID = 'guest-patient-shastho-01';
const GUEST_PROFILE: UserProfile = {
  userId: GUEST_UID,
  email: 'patient.demo@shasthonote.ai',
  displayName: 'Rahim Ahmed (Guest)',
};

// Guest demo data is stored separately from signed-in users' Firestore data.
// Legacy unscoped keys (shastho_notes/docs/apts) are intentionally not loaded:
// they could contain another account's private health information.
function readGuestData<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function writeGuestData<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Could not persist guest demo data in this browser:', error);
  }
}

/** Replace an item with the same id in place (keeps list order), or add it to the top. */
function upsertInPlace<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((existing) => existing.id === item.id)
    ? list.map((existing) => (existing.id === item.id ? item : existing))
    : [item, ...list];
}

export default function App() {
  const [language, setLanguage] = useState<Language>('bn');
  const [workspace, setWorkspace] = useState<WorkspaceMode>('documentation');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(GUEST_PROFILE);
  const [authReady, setAuthReady] = useState(false);
  const [firestoreLoadError, setFirestoreLoadError] = useState<string | null>(null);

  const [notes, setNotes] = useState<HealthNote[]>(() =>
    readGuestData<HealthNote>('shastho:guest:notes', INITIAL_HEALTH_NOTES),
  );
  const [documents, setDocuments] = useState<SourceDocument[]>(() =>
    readGuestData<SourceDocument>('shastho:guest:documents', INITIAL_DOCUMENTS),
  );
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    readGuestData<Appointment>('shastho:guest:appointments', INITIAL_APPOINTMENTS),
  );
  const [studyResources, setStudyResources] = useState<StudyResource[]>(() =>
    readGuestData<StudyResource>('shastho:guest:study_resources', []),
  );

  const [vitals, setVitals] = useState<VitalReading[]>(() => readGuestData<VitalReading>('shastho:guest:vitals', []));
  const [medications, setMedications] = useState<Medication[]>(() => readGuestData<Medication>('shastho:guest:medications', []));
  const [consentState, setConsentState] = useState<AiConsentState>('unset');
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);

  const [selectedNote, setSelectedNote] = useState<HealthNote | null>(notes[0] || null);
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(documents[0] || null);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  // Persist only guest demo data locally. Signed-in records stay in Firestore.
  useEffect(() => {
    if (authReady && !auth.currentUser) {
      writeGuestData('shastho:guest:notes', notes);
    }
  }, [notes, authReady]);

  useEffect(() => {
    if (authReady && !auth.currentUser) {
      writeGuestData('shastho:guest:documents', documents);
    }
  }, [documents, authReady]);

  useEffect(() => {
    if (authReady && !auth.currentUser) {
      writeGuestData('shastho:guest:appointments', appointments);
    }
  }, [appointments, authReady]);

  useEffect(() => {
    if (authReady && !auth.currentUser) {
      writeGuestData('shastho:guest:study_resources', studyResources);
    }
  }, [studyResources, authReady]);

  useEffect(() => {
    if (authReady && !auth.currentUser) {
      writeGuestData('shastho:guest:vitals', vitals);
    }
  }, [vitals, authReady]);

  useEffect(() => {
    if (authReady && !auth.currentUser) {
      writeGuestData('shastho:guest:medications', medications);
    }
  }, [medications, authReady]);

  // Keep language metadata and network status in sync with the browser.
  useEffect(() => {
    document.documentElement.lang = language === 'bn' ? 'bn' : 'en';
  }, [language]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ctrl/⌘+K opens the global search palette from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Load each signed-in user's records from owner-filtered Firestore queries.
  // Never fall back to guest/local records for an authenticated account.
  useEffect(() => {
    let disposed = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setFirestoreLoadError(null);
        setUser(GUEST_PROFILE);
        setNotes(readGuestData<HealthNote>('shastho:guest:notes', INITIAL_HEALTH_NOTES));
        setDocuments(readGuestData<SourceDocument>('shastho:guest:documents', INITIAL_DOCUMENTS));
        setAppointments(readGuestData<Appointment>('shastho:guest:appointments', INITIAL_APPOINTMENTS));
        setStudyResources(readGuestData<StudyResource>('shastho:guest:study_resources', []));
        setVitals(readGuestData<VitalReading>('shastho:guest:vitals', []));
        setMedications(readGuestData<Medication>('shastho:guest:medications', []));
        setConsentState('unset');
        setIsConsentModalOpen(false);
        setSelectedNote(null);
        setSelectedDocument(null);
        setAuthReady(true);
        return;
      }

      setAuthReady(false);
      setFirestoreLoadError(null);
      setUser({
        userId: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Patient',
        photoURL: firebaseUser.photoURL || undefined,
      });
      setNotes([]);
      setDocuments([]);
      setAppointments([]);
      setStudyResources([]);
      setVitals([]);
      setMedications([]);
      setSelectedNote(null);
      setSelectedDocument(null);

      // Ask once per account before any AI request can send text or files to the server.
      const storedConsent = getAiConsentState(firebaseUser.uid);
      setConsentState(storedConsent);
      setIsConsentModalOpen(storedConsent === 'unset');

      try {
        const connectionStatus = await testConnection();
        if (connectionStatus !== 'connected') {
          console.warn(`Firestore connection status: ${connectionStatus}`);
        }

        const [notesSnap, documentsSnap, appointmentsSnap, studyResourcesSnap, fetchedVitals, fetchedMedications] = await Promise.all([
          getDocs(query(collection(db, 'notes'), where('userId', '==', firebaseUser.uid))),
          getDocs(query(collection(db, 'documents'), where('userId', '==', firebaseUser.uid))),
          getDocs(query(collection(db, 'appointments'), where('userId', '==', firebaseUser.uid))),
          getDocs(query(collection(db, 'study_resources'), where('userId', '==', firebaseUser.uid))),
          loadOwnedRecords<VitalReading>('vitals', firebaseUser.uid),
          loadOwnedRecords<Medication>('medications', firebaseUser.uid),
        ]);

        if (disposed || auth.currentUser?.uid !== firebaseUser.uid) return;

        const fetchedNotes = notesSnap.docs
          .map((snapshot) => snapshot.data() as HealthNote)
          .filter((item) => item.userId === firebaseUser.uid);
        const fetchedDocuments = documentsSnap.docs
          .map((snapshot) => snapshot.data() as SourceDocument)
          .filter((item) => item.userId === firebaseUser.uid);
        const fetchedAppointments = appointmentsSnap.docs
          .map((snapshot) => snapshot.data() as Appointment)
          .filter((item) => item.userId === firebaseUser.uid);
        const fetchedStudyResources = studyResourcesSnap.docs
          .map((snapshot) => snapshot.data() as StudyResource)
          .filter((item) => item.userId === firebaseUser.uid);

        setNotes(fetchedNotes);
        setDocuments(fetchedDocuments);
        setAppointments(fetchedAppointments);
        setStudyResources(fetchedStudyResources);
        setVitals(fetchedVitals);
        setMedications(fetchedMedications);
        setSelectedNote(fetchedNotes[0] || null);
        setSelectedDocument(fetchedDocuments[0] || null);
      } catch (error) {
        console.error("Could not load this account's Firestore records:", error);
        if (auth.currentUser?.uid === firebaseUser.uid) {
          setFirestoreLoadError('Saved records could not be loaded. Check your internet connection and confirm the Firestore rules in Firebase Console allow owner-only access.');
        }
        // Keep the account collections empty rather than showing another user's data.
      } finally {
        if (!disposed && auth.currentUser?.uid === firebaseUser.uid) {
          setAuthReady(true);
        }
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  // Keep the signed-in user's own profile document synchronized.
  // This uses only the UserProfile interface fields permitted by firestore.rules.
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!authReady || !currentUser || !user || user.userId !== currentUser.uid) return;

    const profile: UserProfile = {
      userId: currentUser.uid,
      email: currentUser.email || '',
      preferredLanguage: language,
    };
    if (currentUser.displayName) profile.displayName = currentUser.displayName;
    if (currentUser.photoURL) profile.photoURL = currentUser.photoURL;

    void setDoc(doc(db, 'users', currentUser.uid), profile, { merge: true }).catch((error) => {
      console.warn('Could not synchronize the signed-in user profile:', error);
    });
  }, [authReady, language, user?.userId]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // The auth-state listener owns profile and collection loading.
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      window.alert('Google sign-in failed. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The auth-state listener switches back to isolated guest demo data.
    } catch (error) {
      console.error('Sign-out failed:', error);
      window.alert('Sign-out failed. Please try again.');
    }
  };

  const handleSaveNote = async (newNote: HealthNote) => {
    const currentUser = auth.currentUser;
    const noteToSave: HealthNote = {
      ...newNote,
      userId: currentUser?.uid || GUEST_UID,
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'notes', noteToSave.id), noteToSave);
      } catch (error) {
        console.error('Could not save health note:', error);
        window.alert('Your note could not be saved to your account. Please check your connection and try again.');
        throw error;
      }
    }

    setNotes((previous) => [noteToSave, ...previous.filter((item) => item.id !== noteToSave.id)]);
    setSelectedNote(noteToSave);
  };

  const handleSaveDocument = async (newDoc: SourceDocument) => {
    const currentUser = auth.currentUser;
    const documentToSave: SourceDocument = {
      ...newDoc,
      userId: currentUser?.uid || GUEST_UID,
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'documents', documentToSave.id), documentToSave);
      } catch (error) {
        console.error('Could not save medical document:', error);
        window.alert('Your document could not be saved to your account. Please check your connection and try again.');
        throw error;
      }
    }

    setDocuments((previous) => [documentToSave, ...previous.filter((item) => item.id !== documentToSave.id)]);
    setSelectedDocument(documentToSave);
  };

  const handleAddAppointment = async (newApt: Appointment) => {
    const currentUser = auth.currentUser;
    const appointmentToSave: Appointment = {
      ...newApt,
      userId: currentUser?.uid || GUEST_UID,
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'appointments', appointmentToSave.id), appointmentToSave);
      } catch (error) {
        console.error('Could not save appointment:', error);
        window.alert('Your appointment could not be saved to your account. Please check your connection and try again.');
        throw error;
      }
    }

    setAppointments((previous) => [appointmentToSave, ...previous.filter((item) => item.id !== appointmentToSave.id)]);
  };

  const handleSaveStudyResource = async (newResource: StudyResource) => {
    const currentUser = auth.currentUser;
    const resourceToSave: StudyResource = {
      ...newResource,
      userId: currentUser?.uid || GUEST_UID,
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'study_resources', resourceToSave.id), resourceToSave);
      } catch (error) {
        console.error('Could not save study resource:', error);
        throw new Error('Study set could not be saved to your account. Check your connection and try again.');
      }
    }

    setStudyResources((previous) => [resourceToSave, ...previous.filter((item) => item.id !== resourceToSave.id)]);
  };

  // --- Appointments: in-place updates and deletes -------------------------------------------
  const handleUpdateAppointment = async (updated: Appointment) => {
    const currentUser = auth.currentUser;
    const appointmentToSave: Appointment = { ...updated, userId: currentUser?.uid || GUEST_UID };
    if (currentUser) {
      try {
        await saveOwnedRecord('appointments', appointmentToSave);
      } catch (error) {
        console.error('Could not update appointment:', error);
        throw new Error('This change could not be saved to your account. Check your connection and try again.');
      }
    }
    setAppointments((previous) => upsertInPlace(previous, appointmentToSave));
  };

  const handleDeleteAppointment = async (id: string) => {
    if (auth.currentUser) {
      try {
        await deleteOwnedRecord('appointments', id);
      } catch (error) {
        console.error('Could not delete appointment:', error);
        throw new Error('The appointment could not be deleted. Check your connection and try again.');
      }
    }
    setAppointments((previous) => previous.filter((item) => item.id !== id));
  };

  const handleDeleteStudyResource = async (id: string) => {
    if (auth.currentUser) {
      try {
        await deleteOwnedRecord('study_resources', id);
      } catch (error) {
        console.error('Could not delete study resource:', error);
        throw new Error('This item could not be deleted. Check your connection and try again.');
      }
    }
    setStudyResources((previous) => previous.filter((item) => item.id !== id));
  };

  // --- Vitals & medications --------------------------------------------------------------------
  const handleSaveVital = async (reading: VitalReading) => {
    const currentUser = auth.currentUser;
    const toSave: VitalReading = { ...reading, userId: currentUser?.uid || GUEST_UID };
    if (currentUser) {
      try {
        await saveOwnedRecord('vitals', toSave);
      } catch (error) {
        console.error('Could not save vital reading:', error);
        throw new Error('The reading could not be saved to your account. Check your connection and try again.');
      }
    }
    setVitals((previous) => upsertInPlace(previous, toSave));
  };

  const handleDeleteVital = async (id: string) => {
    if (auth.currentUser) {
      try {
        await deleteOwnedRecord('vitals', id);
      } catch (error) {
        console.error('Could not delete vital reading:', error);
        throw new Error('The reading could not be deleted. Check your connection and try again.');
      }
    }
    setVitals((previous) => previous.filter((item) => item.id !== id));
  };

  const handleSaveMedication = async (medication: Medication) => {
    const currentUser = auth.currentUser;
    const toSave: Medication = { ...medication, userId: currentUser?.uid || GUEST_UID };
    if (currentUser) {
      try {
        await saveOwnedRecord('medications', toSave);
      } catch (error) {
        console.error('Could not save medication:', error);
        throw new Error('The medicine could not be saved to your account. Check your connection and try again.');
      }
    }
    setMedications((previous) => upsertInPlace(previous, toSave));
  };

  const handleDeleteMedication = async (id: string) => {
    if (auth.currentUser) {
      try {
        await deleteOwnedRecord('medications', id);
      } catch (error) {
        console.error('Could not delete medication:', error);
        throw new Error('The medicine could not be deleted. Check your connection and try again.');
      }
    }
    setMedications((previous) => previous.filter((item) => item.id !== id));
  };

  // --- Privacy & data center -------------------------------------------------------------------
  const backupData: BackupData = { notes, documents, appointments, studyResources, vitals, medications };

  const handleSetConsent = (granted: boolean) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setAiConsent(currentUser.uid, granted);
    setConsentState(granted ? 'granted' : 'declined');
    setIsConsentModalOpen(false);
  };

  const handleExportBackup = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`shasthonote-backup-${stamp}.json`, JSON.stringify(buildBackupBundle(backupData), null, 2), 'application/json;charset=utf-8');
  };

  const handleExportEncryptedBackup = async (passphrase: string) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const plaintext = JSON.stringify(buildBackupBundle(backupData));
    const encrypted = await encryptBackupText(plaintext, passphrase);
    downloadTextFile(`shasthonote-secure-backup-${stamp}.shasthonote`, encrypted, 'application/json;charset=utf-8');
  };

  const handleImportBackup = async (fileText: string, passphrase = ''): Promise<ImportOutcome> => {
    const plaintext = isEncryptedBackupText(fileText)
      ? await decryptBackupText(fileText, passphrase)
      : fileText;
    const parsed = parseBackupBundle(plaintext);
    if (!parsed.ok) throw new Error(parsed.error);

    const ownerId = auth.currentUser?.uid || GUEST_UID;
    const owned = assignOwner(parsed.data, ownerId);
    let imported = 0;
    let failed = 0;

    // Save each record on its own so one rejected record never blocks the rest.
    const importCollection = async <T extends { id: string; userId: string }>(
      name: OwnedCollection,
      items: T[],
      apply: (item: T) => void,
    ) => {
      for (const item of items) {
        try {
          if (auth.currentUser) await saveOwnedRecord(name, item);
          apply(item);
          imported += 1;
        } catch (error) {
          console.warn(`Could not import a record into ${name}:`, error);
          failed += 1;
        }
      }
    };

    await importCollection('notes', owned.notes, (item) => setNotes((previous) => upsertInPlace(previous, item)));
    await importCollection('documents', owned.documents, (item) => setDocuments((previous) => upsertInPlace(previous, item)));
    await importCollection('appointments', owned.appointments, (item) => setAppointments((previous) => upsertInPlace(previous, item)));
    await importCollection('study_resources', owned.studyResources, (item) => setStudyResources((previous) => upsertInPlace(previous, item)));
    await importCollection('vitals', owned.vitals, (item) => setVitals((previous) => upsertInPlace(previous, item)));
    await importCollection('medications', owned.medications, (item) => setMedications((previous) => upsertInPlace(previous, item)));

    return { imported, skipped: parsed.skipped, failed };
  };

  const handleDeleteAllData = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await deleteAllOwnedRecords(currentUser.uid);
      setNotes([]);
      setDocuments([]);
      setAppointments([]);
      setStudyResources([]);
      setVitals([]);
      setMedications([]);
    } else {
      // Guest: forget local edits and return to the bundled sample content.
      setNotes(INITIAL_HEALTH_NOTES);
      setDocuments(INITIAL_DOCUMENTS);
      setAppointments(INITIAL_APPOINTMENTS);
      setStudyResources([]);
      setVitals([]);
      setMedications([]);
    }
    setSelectedNote(null);
    setSelectedDocument(null);
  };

  // --- Global search / navigation ------------------------------------------------------------
  const searchData = useMemo(
    () => ({ notes, documents, appointments, studyResources, medications }),
    [notes, documents, appointments, studyResources, medications],
  );

  const navigateTo = (tab: string, targetWorkspace: WorkspaceMode = 'documentation') => {
    setWorkspace(targetWorkspace);
    if (tab === 'createNote') setSelectedNote(null);
    setCurrentTab(tab);
  };

  const handleSelectSearchHit = (hit: SearchHit) => {
    if (hit.kind === 'note') {
      const target = notes.find((item) => item.id === hit.id);
      if (target) setSelectedNote(target);
      setWorkspace('documentation');
      setCurrentTab('createNote');
    } else if (hit.kind === 'document') {
      const target = documents.find((item) => item.id === hit.id);
      if (target) setSelectedDocument(target);
      setWorkspace('documentation');
      setCurrentTab('docAnalyzer');
    } else if (hit.kind === 'appointment') {
      navigateTo('appointments');
    } else if (hit.kind === 'medication') {
      navigateTo('medications');
    } else {
      navigateTo('studyStudio', 'research');
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800">
            {language === 'bn' ? 'আপনার নিরাপদ workspace প্রস্তুত হচ্ছে…' : 'Preparing your secure workspace…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'createNote') setSelectedNote(null);
          setCurrentTab(tab);
        }}
        user={user}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {!isOnline && (
        <div className="mx-auto max-w-[1600px] px-4 pt-3 sm:px-6 lg:px-10">
          <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {language === 'bn'
              ? 'আপনি offline আছেন। আগে cache হওয়া app ও স্থানীয় demo data দেখা যেতে পারে; AI request ও নতুন server access-এর জন্য internet লাগবে। Firestore-এর queued change সংযোগ ফিরলে sync হতে পারে।'
              : 'You are offline. The cached app and local demo data may remain available; AI requests and fresh server access require internet. Firestore changes may sync after you reconnect.'}
          </p>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] px-4 pt-3 sm:px-6 lg:px-10">
        {firestoreLoadError ? (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-800">{firestoreLoadError}</p>
        ) : user?.userId === GUEST_UID ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {language === 'bn'
              ? 'Guest demo: নমুনা ও আপনার demo edits শুধু এই browser-এ থাকে। AI generation এবং ব্যক্তিগত Firestore sync ব্যবহার করতে Google দিয়ে sign in করুন।'
              : 'Guest demo: sample data and demo edits stay in this browser. Sign in with Google to use AI generation and private Firestore sync.'}
          </p>
        ) : user ? (
          <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
            {language === 'bn'
              ? 'AI feature ব্যবহার করলে আপনি যে লেখা বা ফাইল নির্বাচন করেন তা server-এর মাধ্যমে Gemini-তে পাঠানো হয়। সংবেদনশীল তথ্য শেয়ার করার আগে বিবেচনা করুন।'
              : 'When you use an AI feature, the text or file you select is sent through the server to Gemini. Consider this before sharing sensitive information.'}
          </p>
        ) : null}
      </div>

      {/* Main View Container */}
      <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-9">
        {/* HEALTH DOCUMENTATION WORKSPACE */}
        {workspace === 'documentation' && (
          <>
            {currentTab === 'healthInsights' && (
              <HealthInsightsView
                language={language}
                vitals={vitals}
                medications={medications}
                documents={documents}
                appointments={appointments}
                onNavigate={(tab) => navigateTo(tab)}
              />
            )}

            {currentTab === 'dashboard' && (
              <TodayPanel
                language={language}
                medications={medications}
                vitals={vitals}
                appointments={appointments}
                onNavigate={(tab) => navigateTo(tab)}
              />
            )}

            {currentTab === 'dashboard' && (
              <DashboardView
                language={language}
                notes={notes}
                documents={documents}
                appointments={appointments}
                onNavigate={(tab) => {
                  if (tab === 'createNote') setSelectedNote(null);
                  setCurrentTab(tab);
                }}
                onSelectNote={(note) => {
                  setSelectedNote(note);
                  setCurrentTab('createNote');
                }}
                onSelectDocument={(doc) => {
                  setSelectedDocument(doc);
                  setCurrentTab('docAnalyzer');
                }}
                onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
              />
            )}

            {currentTab === 'createNote' && (
              <NoteCreatorView
                key={selectedNote?.id || 'new-note'}
                language={language}
                initialNote={selectedNote}
                onSaveNote={handleSaveNote}
                onNavigateToExport={(note) => {
                  setSelectedNote(note);
                  setCurrentTab('exportCenter');
                }}
              />
            )}

            {currentTab === 'docAnalyzer' && (
              <DocumentAnalyzerView
                language={language}
                onSaveDocument={handleSaveDocument}
                selectedDocument={selectedDocument}
              />
            )}

            {currentTab === 'timeline' && (
              <HealthTimelineView
                language={language}
                notes={notes}
                documents={documents}
                appointments={appointments}
                onSelectNote={(note) => {
                  setSelectedNote(note);
                  setCurrentTab('createNote');
                }}
                onSelectDoc={(d) => {
                  setSelectedDocument(d);
                  setCurrentTab('docAnalyzer');
                }}
              />
            )}

            {currentTab === 'appointments' && (
              <AppointmentsView
                language={language}
                appointments={appointments}
                notes={notes}
                onAddAppointment={handleAddAppointment}
                onUpdateAppointment={handleUpdateAppointment}
                onDeleteAppointment={handleDeleteAppointment}
                onNavigateToNote={(noteId) => {
                  const target = notes.find((n) => n.id === noteId);
                  if (target) setSelectedNote(target);
                  setCurrentTab('createNote');
                }}
              />
            )}

            {currentTab === 'exportCenter' && (
              <ExportCenterView
                language={language}
                notes={notes}
                selectedNote={selectedNote}
              />
            )}

            {currentTab === 'vitals' && (
              <VitalsTrackerView language={language} vitals={vitals} onSave={handleSaveVital} onDelete={handleDeleteVital} />
            )}

            {currentTab === 'medications' && (
              <MedicationsView language={language} medications={medications} onSave={handleSaveMedication} onDelete={handleDeleteMedication} />
            )}

            {currentTab === 'labTrends' && (
              <LabTrendsView
                language={language}
                documents={documents}
                onOpenDocument={(documentId) => {
                  const target = documents.find((item) => item.id === documentId);
                  if (target) setSelectedDocument(target);
                  setCurrentTab('docAnalyzer');
                }}
              />
            )}

            {currentTab === 'visitPack' && (
              <VisitPackView
                language={language}
                notes={notes}
                documents={documents}
                appointments={appointments}
                vitals={vitals}
                medications={medications}
                patientName={user && user.userId !== GUEST_UID ? user.displayName : undefined}
              />
            )}

            {currentTab === 'privacyCenter' && (
              <PrivacyCenterView
                language={language}
                isGuest={!auth.currentUser}
                userEmail={user?.email}
                counts={countBackupData(backupData)}
                consentState={consentState}
                onSetConsent={handleSetConsent}
                onExport={handleExportBackup}
                onExportEncrypted={handleExportEncryptedBackup}
                onImport={handleImportBackup}
                onDeleteAll={handleDeleteAllData}
              />
            )}
          </>
        )}

        {/* HEALTH RESEARCH & LEARNING STUDIO */}
        {workspace === 'research' && (
          <>
            {(currentTab === 'research' ||
              !['askRecords', 'mindmap', 'studyStudio', 'audioOverview', 'nearbyCare'].includes(
                currentTab
              )) && (
              <ResearchStudioView
                language={language}
                documents={documents}
              />
            )}

            {currentTab === 'askRecords' && (
              <AskRecordsView language={language} notes={notes} documents={documents} isGuest={!auth.currentUser} />
            )}

            {currentTab === 'mindmap' && (
              <MindMapView
                language={language}
                resources={studyResources}
                onSaveResource={handleSaveStudyResource}
                onDeleteResource={handleDeleteStudyResource}
              />
            )}

            {currentTab === 'studyStudio' && (
              <StudyStudioView
                language={language}
                resources={studyResources}
                onSaveResource={handleSaveStudyResource}
              />
            )}

            {currentTab === 'audioOverview' && (
              <AudioOverviewView language={language} />
            )}

            {currentTab === 'nearbyCare' && (
              <NearbyCareView language={language} />
            )}
          </>
        )}
      </main>

      {/* Emergency Red Flags Guidance Modal */}
      <EmergencyModal
        language={language}
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />

      {/* Global search / jump palette (Ctrl or ⌘ + K) */}
      <CommandPalette
        language={language}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        data={searchData}
        onSelectHit={handleSelectSearchHit}
        onNavigate={(tab, targetWorkspace) => navigateTo(tab, targetWorkspace)}
      />

      {/* One-time AI data-use notice for signed-in accounts */}
      <ConsentModal
        language={language}
        isOpen={isConsentModalOpen}
        onAccept={() => handleSetConsent(true)}
        onDecline={() => handleSetConsent(false)}
      />
    </div>
  );
}
