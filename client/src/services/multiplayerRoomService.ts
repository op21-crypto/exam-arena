import { doc, getDoc, setDoc, updateDoc, onSnapshot, arrayUnion, Unsubscribe } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { UserProfile, SanitizedQuestion, BattlePlayerInfo, Question } from '../types';
import { BUNDLED_QUESTIONS } from '../data/bundledQuestions';
import { BOT_ASPIRANTS } from './localGameEngine';

export interface RoomMember {
  userId: string;
  firebaseUid: string;
  username: string;
  avatar: string;
  rating: number;
  rankTier: string;
  isHost: boolean;
  isReady: boolean;
  isBot?: boolean;
}

export interface FirestoreRoomData {
  roomCode: string;
  player1_id: string; // Required by firestore.rules
  hostUserId: string;
  maxPlayers: number;
  examId: string;
  subjectId: string;
  status: 'waiting' | 'countdown' | 'in_battle' | 'finished';
  members: RoomMember[];
  countdown?: number;
  currentQuestionIndex: number;
  questions: SanitizedQuestion[];
  timeLimitSeconds: number;
  questionStartedAt?: number;
  answers: {
    [qIndex: number]: {
      [userId: string]: {
        selectedOption: number;
        elapsedMs: number;
      };
    };
  };
  scores: {
    [userId: string]: number;
  };
  createdAt: number;
  updatedAt: number;
}

class MultiplayerRoomService {
  private activeUnsub: Unsubscribe | null = null;
  private currentRoomCode: string | null = null;
  private timerInterval: any = null;

  public async ensureAuth(): Promise<string> {
    if (auth.currentUser) {
      return auth.currentUser.uid;
    }
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  }

  public normalizeRoomCode(code: string): string {
    let clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!clean.startsWith('ARENA-') && /^\d+$/.test(clean)) {
      clean = 'ARENA-' + clean;
    }
    return clean;
  }

  public async createRoom(
    user: UserProfile,
    examId: string = 'exam-cgl',
    subjectId: string = 'sub-math',
    maxPlayers: number = 4
  ): Promise<FirestoreRoomData> {
    const fbUid = await this.ensureAuth();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const roomCode = `ARENA-${randomSuffix}`;
    const docId = `battle_${roomCode}`;

    const hostMember: RoomMember = {
      userId: user.id,
      firebaseUid: fbUid,
      username: user.username,
      avatar: user.avatar,
      rating: user.stats?.rating || 1200,
      rankTier: user.stats?.rank_tier || 'Silver',
      isHost: true,
      isReady: true,
      isBot: false
    };

    const roomPayload: FirestoreRoomData = {
      roomCode,
      player1_id: fbUid,
      hostUserId: user.id,
      maxPlayers,
      examId,
      subjectId,
      status: 'waiting',
      members: [hostMember],
      currentQuestionIndex: 0,
      questions: [],
      timeLimitSeconds: 10,
      answers: {},
      scores: { [user.id]: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const docRef = doc(db, 'battles', docId);
    await setDoc(docRef, roomPayload);
    this.currentRoomCode = roomCode;

    return roomPayload;
  }

  public async joinRoom(rawCode: string, user: UserProfile): Promise<{ success: boolean; room?: FirestoreRoomData; error?: string }> {
    const fbUid = await this.ensureAuth();
    const roomCode = this.normalizeRoomCode(rawCode);
    const docId = `battle_${roomCode}`;
    const docRef = doc(db, 'battles', docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: `Room "${roomCode}" not found. Please check the code or link.` };
    }

    const roomData = snap.data() as FirestoreRoomData;

    if (roomData.status === 'in_battle') {
      return { success: false, error: 'Battle is already underway in this room!' };
    }

    // Check if user is already in members
    const existingIndex = roomData.members.findIndex(m => m.userId === user.id);
    if (existingIndex === -1) {
      if (roomData.members.length >= (roomData.maxPlayers || 4)) {
        return { success: false, error: 'Room lobby is full!' };
      }

      const newMember: RoomMember = {
        userId: user.id,
        firebaseUid: fbUid,
        username: user.username,
        avatar: user.avatar,
        rating: user.stats?.rating || 1200,
        rankTier: user.stats?.rank_tier || 'Silver',
        isHost: false,
        isReady: true, // Default ready when joining via invite link
        isBot: false
      };

      await updateDoc(docRef, {
        members: arrayUnion(newMember),
        updatedAt: Date.now()
      });

      roomData.members.push(newMember);
    }

    this.currentRoomCode = roomCode;
    return { success: true, room: roomData };
  }

  public subscribeToRoom(
    rawCode: string,
    onUpdate: (data: FirestoreRoomData) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    this.unsubscribe();

    const roomCode = this.normalizeRoomCode(rawCode);
    const docId = `battle_${roomCode}`;
    const docRef = doc(db, 'battles', docId);

    this.activeUnsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as FirestoreRoomData);
        }
      },
      (err) => {
        console.error('Firestore Room sync error:', err);
        if (onError) onError(err);
      }
    );

    return this.activeUnsub;
  }

  public async toggleReady(rawCode: string, userId: string, isReady: boolean): Promise<void> {
    const roomCode = this.normalizeRoomCode(rawCode);
    const docId = `battle_${roomCode}`;
    const docRef = doc(db, 'battles', docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as FirestoreRoomData;
    const updatedMembers = data.members.map(m => m.userId === userId ? { ...m, isReady } : m);

    await updateDoc(docRef, {
      members: updatedMembers,
      updatedAt: Date.now()
    });
  }

  public async addBot(rawCode: string): Promise<void> {
    const roomCode = this.normalizeRoomCode(rawCode);
    const docId = `battle_${roomCode}`;
    const docRef = doc(db, 'battles', docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as FirestoreRoomData;
    const existingIds = new Set(data.members.map(m => m.userId));
    const available = BOT_ASPIRANTS.filter(b => !existingIds.has(b.userId));
    if (available.length === 0) return;

    const chosen = available[Math.floor(Math.random() * available.length)];
    const botMember: RoomMember = {
      userId: chosen.userId,
      firebaseUid: `bot_${chosen.userId}`,
      username: chosen.username,
      avatar: chosen.avatar,
      rating: chosen.rating,
      rankTier: chosen.rankTier,
      isHost: false,
      isReady: true,
      isBot: true
    };

    await updateDoc(docRef, {
      members: arrayUnion(botMember),
      updatedAt: Date.now()
    });
  }

  public async leaveRoom(rawCode: string, userId: string): Promise<void> {
    try {
      const roomCode = this.normalizeRoomCode(rawCode);
      const docId = `battle_${roomCode}`;
      const docRef = doc(db, 'battles', docId);

      const snap = await getDoc(docRef);
      if (!snap.exists()) return;

      const data = snap.data() as FirestoreRoomData;
      const remainingMembers = data.members.filter(m => m.userId !== userId);

      if (remainingMembers.length === 0) {
        await updateDoc(docRef, {
          status: 'finished',
          updatedAt: Date.now()
        });
      } else {
        let nextHostUserId = data.hostUserId;
        if (data.hostUserId === userId) {
          const nextHuman = remainingMembers.find(m => !m.isBot) || remainingMembers[0];
          nextHostUserId = nextHuman.userId;
          remainingMembers.forEach(m => {
            m.isHost = (m.userId === nextHostUserId);
          });
        }
        await updateDoc(docRef, {
          members: remainingMembers,
          hostUserId: nextHostUserId,
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.warn('Error in leaveRoom:', err);
    }
  }

  public async startBattle(rawCode: string): Promise<void> {
    const roomCode = this.normalizeRoomCode(rawCode);
    const docId = `battle_${roomCode}`;
    const docRef = doc(db, 'battles', docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as FirestoreRoomData;

    // Pick 10 questions filtered by exam & subject
    let pool = [...BUNDLED_QUESTIONS];
    if (data.subjectId && data.subjectId !== 'all') {
      const matchSub = pool.filter(q => q.subject_id === data.subjectId);
      if (matchSub.length >= 5) pool = matchSub;
    }
    if (data.examId) {
      const matchExam = pool.filter(q => q.exam_id === data.examId);
      if (matchExam.length >= 5) pool = matchExam;
    }
    pool.sort(() => Math.random() - 0.5);
    const selectedQuestions: SanitizedQuestion[] = pool.slice(0, 10).map(q => ({
      id: q.id,
      exam_id: q.exam_id,
      subject_id: q.subject_id,
      topic_id: q.topic_id,
      difficulty: q.difficulty,
      question_en: q.question_en,
      question_hi: q.question_hi,
      option_a_en: q.option_a_en,
      option_a_hi: q.option_a_hi,
      option_b_en: q.option_b_en,
      option_b_hi: q.option_b_hi,
      option_c_en: q.option_c_en,
      option_c_hi: q.option_c_hi,
      option_d_en: q.option_d_en,
      option_d_hi: q.option_d_hi,
      pyq_source: q.pyq_source
    }));

    // Step 1: Countdown 3
    await updateDoc(docRef, {
      status: 'countdown',
      countdown: 3,
      questions: selectedQuestions,
      currentQuestionIndex: 0,
      answers: {},
      scores: Object.fromEntries(data.members.map(m => [m.userId, 0])),
      updatedAt: Date.now()
    });

    // Step 2: 3..2..1 Countdown sequence
    setTimeout(async () => {
      await updateDoc(docRef, { countdown: 2, updatedAt: Date.now() });
    }, 1000);

    setTimeout(async () => {
      await updateDoc(docRef, { countdown: 1, updatedAt: Date.now() });
    }, 2000);

    setTimeout(async () => {
      await updateDoc(docRef, {
        status: 'in_battle',
        countdown: 0,
        questionStartedAt: Date.now(),
        updatedAt: Date.now()
      });
    }, 3000);
  }

  public async submitAnswer(
    rawCode: string,
    questionIndex: number,
    userId: string,
    selectedOption: number,
    elapsedMs: number,
    correctOption: number
  ): Promise<void> {
    const roomCode = this.normalizeRoomCode(rawCode);
    const docId = `battle_${roomCode}`;
    const docRef = doc(db, 'battles', docId);

    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as FirestoreRoomData;
    const isCorrect = selectedOption === correctOption;
    let speedBonus = 0;
    if (isCorrect) {
      if (elapsedMs <= 2000) speedBonus = 50;
      else if (elapsedMs <= 4000) speedBonus = 35;
      else if (elapsedMs <= 6000) speedBonus = 20;
      else if (elapsedMs <= 8000) speedBonus = 10;
    }
    const pointsAwarded = isCorrect ? 100 + speedBonus : 0;
    const currentScore = data.scores?.[userId] || 0;
    const newScore = currentScore + pointsAwarded;

    const currentAnswers = data.answers || {};
    const qAnswers = currentAnswers[questionIndex] || {};
    qAnswers[userId] = { selectedOption, elapsedMs };
    currentAnswers[questionIndex] = qAnswers;

    const updatedScores = { ...(data.scores || {}), [userId]: newScore };

    await updateDoc(docRef, {
      answers: currentAnswers,
      scores: updatedScores,
      updatedAt: Date.now()
    });
  }

  public async advanceToNextQuestion(rawCode: string, nextIndex: number): Promise<void> {
    const roomCode = this.normalizeRoomCode(rawCode);
    const docId = `battle_${roomCode}`;
    const docRef = doc(db, 'battles', docId);

    await updateDoc(docRef, {
      currentQuestionIndex: nextIndex,
      questionStartedAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  public async finishBattle(rawCode: string): Promise<void> {
    const roomCode = this.normalizeRoomCode(rawCode);
    const docId = `battle_${roomCode}`;
    const docRef = doc(db, 'battles', docId);

    await updateDoc(docRef, {
      status: 'finished',
      updatedAt: Date.now()
    });
  }

  public unsubscribe(): void {
    if (this.activeUnsub) {
      this.activeUnsub();
      this.activeUnsub = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

export const multiplayerRoomService = new MultiplayerRoomService();
