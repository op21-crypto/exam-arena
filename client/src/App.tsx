import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { socket } from './socket/socket';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeDashboard } from './views/HomeDashboard';
import { BattleHubView } from './views/BattleHubView';
import { PracticeView } from './views/PracticeView';
import { LeaderboardView } from './views/LeaderboardView';
import { ProfileView } from './views/ProfileView';
import { AdminPanel } from './views/AdminPanel';
import { VSModal } from './components/VSModal';
import { BattleScreen } from './components/BattleScreen';
import { BattleResultModal } from './components/BattleResultModal';
import { FriendRoomModal } from './components/FriendRoomModal';
import { CustomBattleModal, CustomBattleConfig } from './components/CustomBattleModal';
import { AuthModal } from './components/AuthModal';
import { localGameEngine } from './services/localGameEngine';
import { multiplayerRoomService, FirestoreRoomData } from './services/multiplayerRoomService';
import { BUNDLED_QUESTIONS } from './data/bundledQuestions';
import { SanitizedQuestion, BattlePlayerInfo, BattleFinishedData } from './types';

export const App: React.FC = () => {
  const { user, lang, setLang, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showFriendModal, setShowFriendModal] = useState<boolean>(false);
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<any>(null);
  const roomTimerRef = useRef<any>(null);

  // Friend Room State
  const [friendRoomData, setFriendRoomData] = useState<any>(null);

  // Active Battle State
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [battlePlayers, setBattlePlayers] = useState<{
    player1: BattlePlayerInfo;
    player2: BattlePlayerInfo;
  } | null>(null);
  const [allBattlePlayers, setAllBattlePlayers] = useState<any[]>([]);

  const [showVSModal, setShowVSModal] = useState<boolean>(false);
  const [vsData, setVsData] = useState<{
    player1: BattlePlayerInfo;
    player2: BattlePlayerInfo;
    countdown: number | null;
    countdownMessage?: string;
  } | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<SanitizedQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [myScore, setMyScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [opponentAnswered, setOpponentAnswered] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(10);
  const [questionResolution, setQuestionResolution] = useState<any>(null);

  // Completed Battle Result State
  const [battleResultData, setBattleResultData] = useState<any>(null);
  const [rematchRequested, setRematchRequested] = useState<boolean>(false);
  const [opponentRematchReady, setOpponentRematchReady] = useState<boolean>(false);

  // 1. Auto-detect ?room=CODE or ?join=CODE in URL query params on load!
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room') || params.get('join');
    if (roomCode) {
      console.log('🔗 Auto-joining friend room from URL query:', roomCode);
      handleJoinFriendRoom(roomCode);
      // Clean query parameter from URL bar without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user?.id]);

  // 2. Real-Time Firestore Room State Sync
  const handleFirestoreRoomUpdate = (room: FirestoreRoomData) => {
    setFriendRoomData(room);

    // Waiting lobby phase
    if (room.status === 'waiting') {
      return;
    }

    // Starting Countdown Phase
    if (room.status === 'countdown') {
      setShowFriendModal(false);
      setActiveBattleId(room.roomCode);

      const hostMember = room.members.find(m => m.isHost) || room.members[0];
      const otherMembers = room.members.filter(m => m.userId !== hostMember.userId);
      const guestMember = otherMembers[0] || hostMember;

      setBattlePlayers({
        player1: {
          userId: hostMember.userId,
          username: hostMember.username,
          avatar: hostMember.avatar,
          rating: hostMember.rating,
          rankTier: hostMember.rankTier
        },
        player2: {
          userId: guestMember.userId,
          username: guestMember.username,
          avatar: guestMember.avatar,
          rating: guestMember.rating,
          rankTier: guestMember.rankTier
        }
      });

      setAllBattlePlayers(room.members.map(m => ({
        ...m,
        score: room.scores?.[m.userId] || 0,
        answered: false
      })));

      setShowVSModal(true);
      setVsData({
        player1: hostMember,
        player2: guestMember,
        countdown: room.countdown ?? 3,
        countdownMessage: room.countdown === 0 ? 'BATTLE!' : undefined
      });
      return;
    }

    // In Battle Phase
    if (room.status === 'in_battle') {
      setShowVSModal(false);
      const qIndex = room.currentQuestionIndex;
      const question = room.questions[qIndex];

      if (question) {
        // If question changed, reset timer and resolution
        if (!currentQuestion || currentQuestion.id !== question.id) {
          setCurrentQuestion(question);
          setQuestionIndex(qIndex);
          setTotalQuestions(room.questions.length);
          setQuestionResolution(null);
          const timeSec = room.timeLimitSeconds || 10;
          setRemainingSeconds(timeSec);

          // Reset local timer matching room's custom time per question
          if (roomTimerRef.current) clearInterval(roomTimerRef.current);
          roomTimerRef.current = setInterval(() => {
            setRemainingSeconds(prev => {
              if (prev <= 1) {
                clearInterval(roomTimerRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }

        // Live Scores
        const mySc = room.scores?.[user?.id || ''] || 0;
        setMyScore(mySc);

        const otherMembers = room.members.filter(m => m.userId !== user?.id);
        const oppSc = otherMembers[0] ? (room.scores?.[otherMembers[0].userId] || 0) : 0;
        setOpponentScore(oppSc);

        // Check if opponent answered current question
        const currentQAnswers = room.answers?.[qIndex] || {};
        const oppAnswered = otherMembers.some(m => Boolean(currentQAnswers[m.userId]));
        setOpponentAnswered(oppAnswered);

        // Update contestant answered indicators
        setAllBattlePlayers(room.members.map(m => ({
          ...m,
          score: room.scores?.[m.userId] || 0,
          answered: Boolean(currentQAnswers[m.userId])
        })));
      }
      return;
    }

    // Finished Phase
    if (room.status === 'finished') {
      if (roomTimerRef.current) clearInterval(roomTimerRef.current);
      setCurrentQuestion(null);
      setQuestionResolution(null);

      const ranked = [...room.members].map(m => {
        const sc = room.scores?.[m.userId] || 0;
        const totalPossible = Math.max(1, room.questions.length * 100);
        return {
          ...m,
          score: sc,
          correctCount: Math.floor(sc / 100),
          accuracy: Math.min(100, Math.round((sc / totalPossible) * 100)),
          ratingChange: sc >= (room.scores?.[user?.id || ''] || 0) ? 24 : -16,
          earnedXp: 150,
          earnedCoins: 35
        };
      }).sort((a, b) => b.score - a.score);

      setBattleResultData({
        battleId: room.roomCode,
        player1: ranked.find(p => p.userId === user?.id) || ranked[0],
        player2: ranked.find(p => p.userId !== user?.id) || ranked[1] || ranked[0],
        questions: room.questions,
        rankedPlayers: ranked
      });
      refreshUser();
    }
  };

  // Socket event listeners (for server-based multiplayer if connected)
  useEffect(() => {
    socket.on('queue_joined', () => {
      setIsSearching(true);
    });

    socket.on('queue_left', () => {
      setIsSearching(false);
    });

    socket.on('battle_matched', (data: {
      battleId: string;
      player1: BattlePlayerInfo;
      player2: BattlePlayerInfo;
      players?: any[];
      totalQuestions: number;
    }) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      setIsSearching(false);
      setShowFriendModal(false);
      setActiveBattleId(data.battleId);
      setBattlePlayers({ player1: data.player1, player2: data.player2 });
      setBattleResultData(null);
      setRematchRequested(false);
      setOpponentRematchReady(false);
      setMyScore(0);
      setOpponentScore(0);
      setTotalQuestions(data.totalQuestions);
      setAllBattlePlayers(data.players || [data.player1, data.player2]);

      setShowVSModal(true);
      setVsData({
        player1: data.player1,
        player2: data.player2,
        countdown: null
      });
    });

    socket.on('battle_countdown', (data: { count: number; message?: string }) => {
      setVsData(prev => prev ? {
        ...prev,
        countdown: data.count,
        countdownMessage: data.message
      } : null);
    });

    socket.on('question_start', (data: {
      battleId: string;
      questionIndex: number;
      totalQuestions: number;
      question: SanitizedQuestion;
      timeLimitSeconds: number;
      players?: any[];
    }) => {
      setShowVSModal(false);
      setCurrentQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setRemainingSeconds(data.timeLimitSeconds);
      setOpponentAnswered(false);
      setQuestionResolution(null);
      if (data.players) setAllBattlePlayers(data.players);
    });

    socket.on('timer_tick', (data: { remainingSeconds: number }) => {
      setRemainingSeconds(data.remainingSeconds);
    });

    socket.on('opponent_status', (data: { hasAnswered: boolean; questionIndex: number; playersAnswered?: any[] }) => {
      setOpponentAnswered(data.hasAnswered);
      if (data.playersAnswered) {
        setAllBattlePlayers(prev => prev.map(p => {
          const match = data.playersAnswered?.find((pa: any) => pa.userId === p.userId);
          return match ? { ...p, answered: match.answered } : p;
        }));
      }
    });

    socket.on('question_resolved', (data: any) => {
      setQuestionResolution(data);
      setMyScore(data.yourScore);
      setOpponentScore(data.opponentScore);
      if (data.allPlayers) setAllBattlePlayers(data.allPlayers);
    });

    socket.on('battle_finished', (data: any) => {
      setCurrentQuestion(null);
      setQuestionResolution(null);
      setBattleResultData(data);
      refreshUser();
    });

    socket.on('rematch_status', (data: { readyCount: number; totalCount: number }) => {
      setRematchRequested(true);
      if (data.readyCount > 1) {
        setOpponentRematchReady(true);
      }
    });

    socket.on('friend_room_created', (data: any) => {
      setFriendRoomData(data);
      setShowFriendModal(true);
    });

    socket.on('friend_room_updated', (data: any) => {
      setFriendRoomData(data);
    });

    socket.on('friend_room_error', (data: { message: string }) => {
      alert(data.message);
    });

    return () => {
      socket.off('queue_joined');
      socket.off('queue_left');
      socket.off('battle_matched');
      socket.off('battle_countdown');
      socket.off('question_start');
      socket.off('timer_tick');
      socket.off('opponent_status');
      socket.off('question_resolved');
      socket.off('battle_finished');
      socket.off('rematch_status');
      socket.off('friend_room_created');
      socket.off('friend_room_updated');
      socket.off('friend_room_error');
    };
  }, [user?.id]);

  // Hybrid 1v1 Battle Launcher: Works 100% online or offline!
  const handleStartQuickBattle = (
    examId?: string,
    subjectId?: string,
    isSpeed?: boolean,
    customOptions?: { questionCount?: number; timeLimitSeconds?: number; playerCount?: number }
  ) => {
    if (!user) return;
    setIsSearching(true);

    const launchLocal = () => {
      setIsSearching(false);
      localGameEngine.startBattle(
        {
          examId,
          subjectId,
          user,
          isSpeed,
          questionCount: customOptions?.questionCount,
          timeLimitSeconds: customOptions?.timeLimitSeconds,
          playerCount: customOptions?.playerCount
        },
        {
          onMatched: (data) => {
            setIsSearching(false);
            setShowFriendModal(false);
            setShowCustomModal(false);
            setActiveBattleId(data.battleId);
            setBattlePlayers({ player1: data.player1, player2: data.player2 });
            setAllBattlePlayers(data.players || [data.player1, data.player2]);
            setBattleResultData(null);
            setRematchRequested(false);
            setOpponentRematchReady(false);
            setMyScore(0);
            setOpponentScore(0);
            setTotalQuestions(data.totalQuestions);
            setShowVSModal(true);
            setVsData({
              player1: data.player1,
              player2: data.player2,
              countdown: null
            });
          },
          onCountdown: (data) => {
            setVsData(prev => prev ? {
              ...prev,
              countdown: data.count,
              countdownMessage: data.message
            } : null);
          },
          onQuestionStart: (data) => {
            setShowVSModal(false);
            setCurrentQuestion(data.question);
            setQuestionIndex(data.questionIndex);
            setTotalQuestions(data.totalQuestions);
            setRemainingSeconds(data.timeLimitSeconds);
            setOpponentAnswered(false);
            setQuestionResolution(null);
            if (data.players) setAllBattlePlayers(data.players);
          },
          onTimerTick: (data) => {
            setRemainingSeconds(data.remainingSeconds);
          },
          onOpponentStatus: (data) => {
            setOpponentAnswered(data.hasAnswered);
            if (data.playersAnswered) {
              setAllBattlePlayers(prev => prev.map(p => {
                const match = data.playersAnswered?.find((pa: any) => pa.userId === p.userId);
                return match ? { ...p, answered: match.answered } : p;
              }));
            }
          },
          onQuestionResolved: (data) => {
            setQuestionResolution(data);
            setMyScore(data.yourScore);
            setOpponentScore(data.opponentScore);
            if (data.allPlayers) setAllBattlePlayers(data.allPlayers);
          },
          onBattleFinished: (data) => {
            setCurrentQuestion(null);
            setQuestionResolution(null);
            setBattleResultData(data);
            refreshUser();
          }
        }
      );
    };

    if (socket && socket.connected) {
      socket.emit('join_queue', {
        userId: user.id,
        examId,
        subjectId,
        questionCount: customOptions?.questionCount,
        timeLimitSeconds: customOptions?.timeLimitSeconds,
        playerCount: customOptions?.playerCount
      });

      // Resilient 1.8s timeout: if server queue doesn't pair immediately, launch local bot
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        if (!activeBattleId) {
          launchLocal();
        }
      }, 1800);
    } else {
      // Standalone mode: 500ms realistic pulse then start
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        launchLocal();
      }, 500);
    }
  };

  const handleCancelSearch = () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (socket && socket.connected) {
      socket.emit('leave_queue');
    }
    localGameEngine.stopActiveBattle();
    setIsSearching(false);
  };

  const handleSubmitAnswer = async (selectedOption: number, elapsedMs: number) => {
    if (!activeBattleId || !user) return;

    // A. Real-Time Friend Room Battle (Firestore)
    if (activeBattleId.startsWith('ARENA-') && friendRoomData) {
      const qIndex = questionIndex;
      const curQ = currentQuestion;
      if (!curQ) return;

      const bundledMatch = BUNDLED_QUESTIONS.find(q => q.id === curQ.id);
      const correctOption = bundledMatch ? bundledMatch.correct_option : 0;

      await multiplayerRoomService.submitAnswer(
        activeBattleId,
        qIndex,
        user.id,
        selectedOption,
        elapsedMs,
        correctOption
      );

      const isCorrect = selectedOption === correctOption;
      let speedBonus = 0;
      if (isCorrect) {
        if (elapsedMs <= 2000) speedBonus = 50;
        else if (elapsedMs <= 4000) speedBonus = 35;
        else if (elapsedMs <= 6000) speedBonus = 20;
        else if (elapsedMs <= 8000) speedBonus = 10;
      }
      const pointsAwarded = isCorrect ? 100 + speedBonus : 0;

      setQuestionResolution({
        questionIndex: qIndex,
        correctOption,
        explanation_en: bundledMatch?.explanation_en || '',
        explanation_hi: bundledMatch?.explanation_hi || '',
        yourChoice: selectedOption,
        isCorrect,
        pointsAwarded,
        yourScore: myScore + pointsAwarded,
        opponentChoice: null,
        opponentScore
      });

      // If user is host: advance after 3s
      const isHost = friendRoomData.hostUserId === user.id;
      if (isHost) {
        setTimeout(async () => {
          if (qIndex < totalQuestions - 1) {
            await multiplayerRoomService.advanceToNextQuestion(activeBattleId, qIndex + 1);
          } else {
            await multiplayerRoomService.finishBattle(activeBattleId);
          }
        }, 3000);
      }
      return;
    }

    // B. Local Bot Battle
    if (activeBattleId.startsWith('local_battle_')) {
      localGameEngine.submitAnswer(selectedOption, elapsedMs);
      return;
    }

    // C. Socket Server Battle
    socket.emit('submit_answer', {
      battleId: activeBattleId,
      questionIndex,
      selectedOption,
      elapsedMs
    });
  };

  const handleRematch = () => {
    if (!activeBattleId) return;
    setRematchRequested(true);

    if (activeBattleId.startsWith('local_battle_')) {
      setTimeout(() => {
        setOpponentRematchReady(true);
        handleStartQuickBattle();
      }, 600);
    } else if (activeBattleId.startsWith('ARENA-')) {
      handleCreateFriendRoom();
    } else {
      socket.emit('request_rematch', { battleId: activeBattleId });
    }
  };

  const handleReturnHome = () => {
    if (activeBattleId?.startsWith('ARENA-') && user) {
      multiplayerRoomService.leaveRoom(activeBattleId, user.id);
    }
    if (activeBattleId && socket && socket.connected) {
      socket.emit('leave_battle', { battleId: activeBattleId, userId: user?.id });
    }
    multiplayerRoomService.unsubscribe();
    localGameEngine.stopActiveBattle();
    if (roomTimerRef.current) clearInterval(roomTimerRef.current);
    setActiveBattleId(null);
    setBattlePlayers(null);
    setShowVSModal(false);
    setVsData(null);
    setBattleResultData(null);
    setCurrentQuestion(null);
    setActiveTab('home');
  };

  const handleNavTabChange = (tab: NavTab) => {
    if (activeBattleId || currentQuestion) {
      if (activeBattleId?.startsWith('ARENA-') && user) {
        multiplayerRoomService.leaveRoom(activeBattleId, user.id);
      }
      multiplayerRoomService.unsubscribe();
      localGameEngine.stopActiveBattle();
      if (roomTimerRef.current) clearInterval(roomTimerRef.current);
      setActiveBattleId(null);
      setBattlePlayers(null);
      setShowVSModal(false);
      setVsData(null);
      setBattleResultData(null);
      setCurrentQuestion(null);
    }
    setActiveTab(tab);
  };

  // Friend Room: Create
  const handleCreateFriendRoom = async (
    examId?: string,
    subjectId?: string,
    maxPlayers?: number,
    questionCount?: number,
    timeLimitSeconds?: number
  ) => {
    if (!user) return;
    try {
      // Create real-time room in Firestore
      const room = await multiplayerRoomService.createRoom(
        user,
        examId,
        subjectId,
        maxPlayers,
        questionCount || 10,
        timeLimitSeconds || 10
      );
      setFriendRoomData(room);
      setShowFriendModal(true);

      // Subscribe to real-time updates so Host immediately sees friend join!
      multiplayerRoomService.subscribeToRoom(room.roomCode, handleFirestoreRoomUpdate);

      // Also emit to socket if connected
      if (socket && socket.connected) {
        socket.emit('create_friend_room', {
          userId: user.id,
          roomCode: room.roomCode,
          examId,
          subjectId,
          maxPlayers: maxPlayers || 4,
          questionCount: questionCount || 10,
          timeLimitSeconds: timeLimitSeconds || 10
        });
      }
    } catch (err) {
      console.warn('Firestore room create error, using local room fallback:', err);
      const localRoom = localGameEngine.createFriendRoom(user, examId, subjectId, maxPlayers);
      setFriendRoomData(localRoom);
      setShowFriendModal(true);
    }
  };

  // Friend Room: Join (Called via link or code entry)
  const handleJoinFriendRoom = async (code: string) => {
    if (!user) return;
    try {
      const res = await multiplayerRoomService.joinRoom(code, user);
      if (res.success && res.room) {
        setFriendRoomData(res.room);
        setShowFriendModal(true);

        // Subscribe to real-time room updates!
        multiplayerRoomService.subscribeToRoom(res.room.roomCode, handleFirestoreRoomUpdate);

        if (socket && socket.connected) {
          socket.emit('join_friend_room', {
            roomCode: res.room.roomCode,
            userId: user.id
          });
        }
      } else {
        alert(res.error || 'Failed to join room. Please check the code.');
      }
    } catch (err: any) {
      console.error('Failed to join friend room:', err);
      alert('Error joining room: ' + err.message);
    }
  };

  const handleAddBotToFriendRoom = async () => {
    if (!friendRoomData) return;
    if (friendRoomData.roomCode?.startsWith('ARENA-')) {
      await multiplayerRoomService.addBot(friendRoomData.roomCode);
    } else {
      const updated = localGameEngine.addBotToRoom(friendRoomData);
      setFriendRoomData(updated);
    }
  };

  const handleToggleReadyInFriendRoom = async (isReady: boolean) => {
    if (!friendRoomData || !user) return;
    if (friendRoomData.roomCode?.startsWith('ARENA-')) {
      await multiplayerRoomService.toggleReady(friendRoomData.roomCode, user.id, isReady);
    }
  };

  const handleStartFriendBattle = async (room: any) => {
    if (!room) return;
    if (room.roomCode?.startsWith('ARENA-')) {
      await multiplayerRoomService.startBattle(room.roomCode);
    }
  };

  return (
    <div className="min-h-screen bg-arena-bg text-slate-100 flex flex-col font-sans">
      <Header onOpenAuth={() => setShowAuthModal(true)} onNavigateTab={handleNavTabChange} />

      <main className="flex-1 w-full max-w-4xl mx-auto">
        {currentQuestion && activeBattleId && battlePlayers ? (
          <BattleScreen
            battleId={activeBattleId}
            question={currentQuestion}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            myUserId={user?.id || ''}
            player1={battlePlayers.player1}
            player2={battlePlayers.player2}
            allPlayers={allBattlePlayers}
            myScore={myScore}
            opponentScore={opponentScore}
            opponentAnswered={opponentAnswered}
            remainingSeconds={remainingSeconds}
            resolution={questionResolution}
            onSubmitAnswer={handleSubmitAnswer}
            onQuitBattle={handleReturnHome}
            lang={lang}
            onToggleLang={() => setLang(lang === 'en' ? 'hi' : 'en')}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeDashboard
                onStartQuickBattle={handleStartQuickBattle}
                onOpenFriendRoom={() => {
                  if (!friendRoomData && user) {
                    handleCreateFriendRoom();
                  } else {
                    setShowFriendModal(true);
                  }
                }}
                onOpenCustomBattle={() => setShowCustomModal(true)}
                onOpenPractice={() => setActiveTab('practice')}
                onNavigateTab={handleNavTabChange}
                isSearching={isSearching}
                onCancelSearch={handleCancelSearch}
              />
            )}

            {activeTab === 'battle' && (
              <BattleHubView
                onStartBattle={(exId, subId, customOptions) => handleStartQuickBattle(exId, subId, false, customOptions)}
                isSearching={isSearching}
                onCancelSearch={handleCancelSearch}
                onNavigateTab={handleNavTabChange}
              />
            )}

            {activeTab === 'practice' && <PracticeView onNavigateTab={handleNavTabChange} />}
            {activeTab === 'leaderboard' && <LeaderboardView onNavigateTab={handleNavTabChange} />}
            {activeTab === 'profile' && <ProfileView onNavigateTab={handleNavTabChange} />}
            {activeTab === 'admin' && user?.is_admin === 1 && <AdminPanel onNavigateTab={handleNavTabChange} />}
          </>
        )}
      </main>

      {/* Persistent Bottom Navigation: Always accessible and functional */}
      <BottomNav activeTab={activeTab} onChangeTab={handleNavTabChange} />

      {showVSModal && vsData && (
        <VSModal
          player1={vsData.player1}
          player2={vsData.player2}
          countdown={vsData.countdown}
          countdownMessage={vsData.countdownMessage}
          onCancel={handleReturnHome}
          lang={lang}
        />
      )}

      {battleResultData && (
        <BattleResultModal
          data={battleResultData}
          myUserId={user?.id || ''}
          onRematch={handleRematch}
          onReturnHome={handleReturnHome}
          rematchRequested={rematchRequested}
          opponentRematchReady={opponentRematchReady}
          lang={lang}
        />
      )}

      {showFriendModal && (
        <FriendRoomModal
          onClose={() => {
            if (friendRoomData?.roomCode && user) {
              multiplayerRoomService.leaveRoom(friendRoomData.roomCode, user.id);
            }
            multiplayerRoomService.unsubscribe();
            setShowFriendModal(false);
            setFriendRoomData(null);
          }}
          roomData={friendRoomData}
          onCreateRoom={handleCreateFriendRoom}
          onJoinRoom={handleJoinFriendRoom}
          onAddBot={handleAddBotToFriendRoom}
          onToggleReady={handleToggleReadyInFriendRoom}
          onStartRoomBattle={handleStartFriendBattle}
        />
      )}

      {showCustomModal && (
        <CustomBattleModal
          onClose={() => setShowCustomModal(false)}
          onStartBattle={(config: CustomBattleConfig) => {
            handleStartQuickBattle(
              config.examId,
              config.subjectId === 'all' ? undefined : config.subjectId,
              false,
              config
            );
          }}
          onCreateFriendRoom={(config: CustomBattleConfig) => {
            handleCreateFriendRoom(
              config.examId,
              config.subjectId === 'all' ? 'sub-math' : config.subjectId,
              config.playerCount,
              config.questionCount,
              config.timeLimitSeconds
            );
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};
