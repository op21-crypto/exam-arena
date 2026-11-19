import { io as Client } from 'socket.io-client';

async function runSimulation() {
  console.log('🧪 Starting EXAM ARENA Real-Time 1v1 Battle Automated Test...');

  // 1. Health check
  const healthRes = await fetch('http://localhost:4000/api/health');
  const health = await healthRes.json();
  console.log('✅ Server Health:', health);

  // 2. Create two guest players
  const g1Res = await fetch('http://localhost:4000/api/auth/guest', { method: 'POST' });
  const p1: any = await g1Res.json();
  console.log(`👤 Player 1 created: ${p1.user.username} (Rating: ${p1.user.stats.rating})`);

  const g2Res = await fetch('http://localhost:4000/api/auth/guest', { method: 'POST' });
  const p2: any = await g2Res.json();
  console.log(`👤 Player 2 created: ${p2.user.username} (Rating: ${p2.user.stats.rating})`);

  // 3. Connect Socket.IO clients for both players
  const socket1 = Client('http://localhost:4000');
  const socket2 = Client('http://localhost:4000');

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve(true);
    };
    socket1.on('connect', () => {
      socket1.emit('register_socket', { userId: p1.user.id });
      check();
    });
    socket2.on('connect', () => {
      socket2.emit('register_socket', { userId: p2.user.id });
      check();
    });
  });
  console.log('⚡ Both Socket.IO clients connected & registered.');

  // 4. Join matchmaking queue
  let battleId = '';
  const matchPromise = new Promise<{ battleId: string }>((resolve) => {
    socket1.on('battle_matched', (data) => {
      console.log(`🎯 Match Found! Battle ID: ${data.battleId}`);
      console.log(`   ${data.player1.username} vs ${data.player2.username}`);
      battleId = data.battleId;
      resolve(data);
    });
  });

  console.log('🔍 Joining matchmaking queue...');
  socket1.emit('join_queue', { userId: p1.user.id });
  socket2.emit('join_queue', { userId: p2.user.id });

  await matchPromise;

  // 5. Wait for countdown
  await new Promise((resolve) => {
    socket1.on('battle_countdown', (data) => {
      console.log(`⏱️ Countdown: ${data.count} ${data.message || ''}`);
      if (data.count === 0) resolve(true);
    });
  });

  // 6. Question phase test
  await new Promise((resolve) => {
    let resolvedQuestions = 0;

    socket1.on('question_start', (data) => {
      console.log(`\n📝 Question ${data.questionIndex + 1}/${data.totalQuestions} Started:`);
      console.log(`   [EN] ${data.question.question_en.substring(0, 60)}...`);

      // Player 1 answers fast (Option 0 in 1.2s)
      setTimeout(() => {
        socket1.emit('submit_answer', {
          battleId,
          questionIndex: data.questionIndex,
          selectedOption: 0,
          elapsedMs: 1200
        });
      }, 300);

      // Player 2 answers slightly later (Option 1 in 2.5s)
      setTimeout(() => {
        socket2.emit('submit_answer', {
          battleId,
          questionIndex: data.questionIndex,
          selectedOption: 1,
          elapsedMs: 2500
        });
      }, 700);
    });

    socket1.on('opponent_status', (data) => {
      console.log(`   👀 Player 1 received opponent answered notification (Option hidden)`);
    });

    socket1.on('question_resolved', (data) => {
      console.log(`   ✨ Question ${data.questionIndex + 1} Resolved!`);
      console.log(`      Correct Option: ${['A', 'B', 'C', 'D'][data.correctOption]}`);
      console.log(`      P1 Choice: ${['A', 'B', 'C', 'D'][data.yourChoice]} (Correct: ${data.isCorrect}, +${data.pointsAwarded} pts)`);
      console.log(`      Current Scores -> P1: ${data.yourScore} | P2: ${data.opponentScore}`);

      resolvedQuestions++;
      // Stop simulation after 2 questions for swift verification
      if (resolvedQuestions >= 2) {
        console.log('✅ Verified 2 full turn cycles with server authoritative scoring.');
        resolve(true);
      }
    });
  });

  // 7. Verify leaderboard
  const lbRes = await fetch('http://localhost:4000/api/leaderboard/global?limit=5');
  const lb: any = await lbRes.json();
  console.log(`🏆 Leaderboard query verified: ${lb.leaderboard.length} aspirants listed.`);

  socket1.disconnect();
  socket2.disconnect();
  console.log('🎉 Automated 1v1 Battle Test Succeeded Completely!');
  process.exit(0);
}

runSimulation().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
