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
import { AuthModal } from './components/AuthModal';
import { localGameEngine } from './services/localGameEngine';
import { SanitizedQuestion, BattlePlayerInfo, BattleFinishedData } from './types';

export const App: React.FC = () => {
  const { user, lang, setLang, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showFriendModal, setShowFriendModal] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchTimeoutRef = useRef<any>(null);

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

  // Auto-detect ?room=CODE or ?join=CODE in URL query params on load!
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room') || params.get('join');
    if (roomCode) {
      console.log('🔗 Auto-joining friend room from URL query:', roomCode);
      if (socket && socket.connected) {
        socket.emit('join_friend_room', {
          roomCode: roomCode.toUpperCase(),
          userId: user.id
        });
      } else {
        // Local join
        const localRoom = localGameEngine.createFriendRoom(user);
        localRoom.roomCode = roomCode.toUpperCase();
        setFriendRoomData(localRoom);
      }
      setShowFriendModal(true);
    }
  }, [user?.id]);

  // Socket event listeners
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

  // Hybrid Battle Launcher: Works 100% online or offline!
  const handleStartQuickBattle = (examId?: string, subjectId?: string, isSpeed?: boolean) => {
    if (!user) return;
    setIsSearching(true);

    const launchLocal = () => {
      setIsSearching(false);
      localGameEngine.startBattle(
        { examId, subjectId, user, isSpeed },
        {
          onMatched: (data) => {
            setIsSearching(false);
            setShowFriendModal(false);
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
        subjectId
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

  const handleSubmitAnswer = (selectedOption: number, elapsedMs: number) => {
    if (!activeBattleId) return;

    if (activeBattleId.startsWith('local_battle_')) {
      localGameEngine.submitAnswer(selectedOption, elapsedMs);
    } else {
      socket.emit('submit_answer', {
        battleId: activeBattleId,
        questionIndex,
        selectedOption,
        elapsedMs
      });
    }
  };

  const handleRematch = () => {
    if (!activeBattleId) return;
    setRematchRequested(true);

    if (activeBattleId.startsWith('local_battle_')) {
      setTimeout(() => {
        setOpponentRematchReady(true);
        handleStartQuickBattle();
      }, 600);
    } else {
      socket.emit('request_rematch', { battleId: activeBattleId });
    }
  };

  const handleReturnHome = () => {
    localGameEngine.stopActiveBattle();
    setActiveBattleId(null);
    setBattlePlayers(null);
    setShowVSModal(false);
    setVsData(null);
    setBattleResultData(null);
    setCurrentQuestion(null);
    setActiveTab('home');
  };

  const handleCreateFriendRoom = (examId?: string, subjectId?: string, maxPlayers?: number) => {
    if (!user) return;
    if (socket && socket.connected) {
      socket.emit('create_friend_room', {
        userId: user.id,
        examId,
        subjectId,
        maxPlayers: maxPlayers || 4
      });
    } else {
      const room = localGameEngine.createFriendRoom(user, examId, subjectId, maxPlayers);
      setFriendRoomData(room);
      setShowFriendModal(true);
    }
  };

  const handleJoinFriendRoom = (code: string) => {
    if (!user) return;
    if (socket && socket.connected) {
      socket.emit('join_friend_room', {
        roomCode: code,
        userId: user.id
      });
    } else {
      const room = localGameEngine.createFriendRoom(user);
      room.roomCode = code;
      setFriendRoomData(room);
    }
  };

  const handleAddBotLocal = () => {
    if (!friendRoomData) return;
    const updated = localGameEngine.addBotToRoom(friendRoomData);
    setFriendRoomData(updated);
  };

  const handleStartRoomBattleLocal = (room: any) => {
    if (!user || !room) return;
    setShowFriendModal(false);

    const contestantBots = room.members.filter((m: any) => m.userId !== user.id);

    localGameEngine.startBattle(
      {
        examId: room.examId,
        subjectId: room.subjectId,
        user,
        contestantBots
      },
      {
        onMatched: (data) => {
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

  return (
    <div className="min-h-screen bg-arena-bg text-slate-100 flex flex-col font-sans">
      <Header onOpenAuth={() => setShowAuthModal(true)} onNavigateTab={setActiveTab} />

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
                onOpenPractice={() => setActiveTab('practice')}
                onNavigateTab={setActiveTab}
                isSearching={isSearching}
                onCancelSearch={handleCancelSearch}
              />
            )}

            {activeTab === 'battle' && (
              <BattleHubView
                onStartBattle={(exId, subId) => handleStartQuickBattle(exId, subId)}
                isSearching={isSearching}
                onCancelSearch={handleCancelSearch}
              />
            )}

            {activeTab === 'practice' && <PracticeView />}
            {activeTab === 'leaderboard' && <LeaderboardView />}
            {activeTab === 'profile' && <ProfileView />}
            {activeTab === 'admin' && user?.is_admin === 1 && <AdminPanel />}
          </>
        )}
      </main>

      {!currentQuestion && (
        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      )}

      {showVSModal && vsData && (
        <VSModal
          player1={vsData.player1}
          player2={vsData.player2}
          countdown={vsData.countdown}
          countdownMessage={vsData.countdownMessage}
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
            setShowFriendModal(false);
            setFriendRoomData(null);
          }}
          roomData={friendRoomData}
          onCreateRoom={handleCreateFriendRoom}
          onJoinRoom={handleJoinFriendRoom}
          onAddBotLocal={handleAddBotLocal}
          onStartRoomBattleLocal={handleStartRoomBattleLocal}
        />
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};
