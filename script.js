/**
 * 학급 1인 1역할 배정 도우미 - script.js (지브리 숲속 교실 에디션)
 * 
 * 주요 기능:
 * 1. 학생 12명 & 학급 역할 12개 기본 예시 데이터 탑재
 * 2. [🎲 역할 배정하기] 무작위 1:1 랜덤 매칭 & 오르골/풍경소리 효과음 & 숲속 흩날리는 잎사귀/꽃잎 파티클
 * 3. [🖨️ A4 게시판 인쇄] 지브리 가랜드가 담긴 정갈한 A4 교실 게시판 인쇄
 * 4. [🔄 시트 불러오기], [💾 시트에 결과 저장] 구글 스프레드시트 Apps Script 연동 준비
 * 5. 카드 맞교환(스왑), 명단/역할 편집, 엑셀/한글 표 복사, localStorage 자동 저장
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 기본 예시 데이터 (12명 학생 & 12개 역할)
  // ==========================================
  const DEFAULT_STUDENTS = [
    '김민준', '이서연', '박도윤', '최지우',
    '정예준', '강하은', '조시우', '윤수아',
    '장은우', '임지아', '한서준', '오다은'
  ];

  const DEFAULT_ROLES = [
    { id: 1, icon: '🧹', name: '칠판 지킴이', desc: '수업 후 칠판을 깨끗이 지우고 분필 가루를 정리해요.' },
    { id: 2, icon: '🥛', name: '우유 도우미', desc: '급식실에서 우유를 가져오고 다 마신 우유갑을 정리해요.' },
    { id: 3, icon: '💡', name: '에너지 지킴이', desc: '쉬는 시간과 하교 시 전등 및 전자 기기를 꺼요.' },
    { id: 4, icon: '📚', name: '도서 대장', desc: '학급 문고 책을 바르게 꽂고 독서 통장을 도와줘요.' },
    { id: 5, icon: '🚶‍♂️', name: '줄서기 반장', desc: '이동 수업이나 급식실 갈 때 두 줄로 바르게 세워요.' },
    { id: 6, icon: '♻️', name: '분리수거 요원', desc: '재활용 쓰레기와 일반 쓰레기가 섞이지 않게 도와줘요.' },
    { id: 7, icon: '🪟', name: '창문·환기 대장', desc: '쉬는 시간마다 교실 창문을 열어 맑은 숲바람을 채워요.' },
    { id: 8, icon: '🌱', name: '식물 집사', desc: '교실 화분 식물들에게 다정한 사랑과 물을 줘요.' },
    { id: 9, icon: '✨', name: '방역·위생 위원', desc: '손 소독제를 채우고 교실 책상 청결을 살펴요.' },
    { id: 10, icon: '📄', name: '학습지 전달관', desc: '선생님이 주시는 학습지와 알림장을 친구들에게 나눠줘요.' },
    { id: 11, icon: '⚽', name: '체육 용구 대장', desc: '체육 시간에 공과 줄넘기를 챙기고 수업 후 제자리에 둬요.' },
    { id: 12, icon: '💌', name: '칭찬 배달부', desc: '친구들의 따뜻한 칭찬 쪽지를 모아 칭찬함에 배달해요.' }
  ];

  // ==========================================
  // 2. 상태 관리 (State)
  // ==========================================
  let state = {
    students: [],
    roles: [],
    assignments: [], // Array of { student: string, role: { id, icon, name, desc } }
    classTitle: '🌳 숲속 우리 반 1인 1역할 배정표',
    assignDate: new Date().toISOString().split('T')[0],
    viewMode: 'grid', // 'grid' | 'table'
    soundEnabled: true,
    sheetUrl: '',
    selectedCardIndex: null, // For manual swap
    isShuffling: false
  };

  // LocalStorage Keys
  const STORAGE_KEY = 'ghibli_class_role_assigner_v1';
  const SHEET_URL_KEY = 'class_role_sheet_url_v1';

  // ==========================================
  // 3. 지브리 오르골 & 풍경소리 Web Audio API
  // ==========================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
  }

  // 지브리 펜타토닉 풍경 음계 (Celesta / Glockenspiel chime)
  const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5, D5, E5, G5, A5, C6

  function playTickSound() {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine'; // 따뜻하고 맑은 톤

      const freq = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Audio silent fallback
    }
  }

  function playFanfare() {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      // 지브리 서정적 오르골 멜로디 아르페지오 (C - G - C - E - G - C6)
      const notes = [
        { f: 523.25, t: 0.00, d: 0.4 },  // C5
        { f: 659.25, t: 0.12, d: 0.4 },  // E5
        { f: 783.99, t: 0.24, d: 0.4 },  // G5
        { f: 1046.5, t: 0.38, d: 0.6 },  // C6
        { f: 1318.5, t: 0.52, d: 0.9 }   // E6 (여운)
      ];

      notes.forEach(n => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.f, audioCtx.currentTime + n.t);

        const start = audioCtx.currentTime + n.t;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + n.d);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + n.d);
      });
    } catch (e) {
      // Silent catch
    }
  }

  // ==========================================
  // 4. 지브리 숲바람 파티클 (나뭇잎, 민들레 홀씨, 벚꽃잎)
  // ==========================================
  const confettiCanvas = document.getElementById('confettiCanvas');
  const ctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
  let forestParticles = [];
  let animId = null;

  function resizeCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function triggerConfetti() {
    if (!ctx || !confettiCanvas) return;
    resizeCanvas();

    forestParticles = [];
    // 3가지 지브리 파티클 타입: 'leaf'(나뭇잎), 'petal'(벚꽃잎), 'spore'(황금 홀씨)
    const types = ['leaf', 'leaf', 'petal', 'petal', 'spore'];
    const leafColors = ['#52b788', '#40916c', '#74c69d', '#a7c957', '#e76f51'];
    const petalColors = ['#ffccd5', '#ffb3c1', '#f472b6'];

    for (let i = 0; i < 75; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      let color = '#fef08a';
      if (type === 'leaf') color = leafColors[Math.floor(Math.random() * leafColors.length)];
      if (type === 'petal') color = petalColors[Math.floor(Math.random() * petalColors.length)];

      forestParticles.push({
        type: type,
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 260,
        y: confettiCanvas.height / 3 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 8 - 3,
        size: Math.random() * 8 + 8,
        color: color,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 6,
        wobble: Math.random() * Math.PI,
        opacity: 1
      });
    }

    if (animId) cancelAnimationFrame(animId);
    animateParticles();
  }

  function animateParticles() {
    if (!ctx || !confettiCanvas) return;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    let activeCount = 0;
    for (let p of forestParticles) {
      p.x += p.vx + Math.sin(p.wobble) * 1.5;
      p.y += p.vy;
      p.vy += 0.22; // 부드러운 바람 낙하
      p.wobble += 0.05;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.007;

      if (p.opacity > 0 && p.y < confettiCanvas.height) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;

        if (p.type === 'leaf') {
          // 나뭇잎 형태 그리기
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'petal') {
          // 벚꽃잎 하트/타원 형태
          ctx.beginPath();
          ctx.arc(-p.size * 0.25, 0, p.size * 0.35, 0, Math.PI * 2);
          ctx.arc(p.size * 0.25, 0, p.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 반짝이는 작은 황금 홀씨
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    if (activeCount > 0) {
      animId = requestAnimationFrame(animateParticles);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // ==========================================
  // 5. Toast 알림
  // ==========================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '🌿';
    if (type === 'success') icon = '🌰';
    if (type === 'warn') icon = '🐾';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ==========================================
  // 6. 데이터 초기화 및 로드/저장
  // ==========================================
  function loadSavedData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.students = Array.isArray(parsed.students) && parsed.students.length > 0 ? parsed.students : [...DEFAULT_STUDENTS];
        state.roles = Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : [...DEFAULT_ROLES];
        state.classTitle = parsed.classTitle || '🌳 숲속 우리 반 1인 1역할 배정표';
        state.assignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
        if (parsed.assignDate) state.assignDate = parsed.assignDate;
      } else {
        resetToDefaults();
      }

      state.sheetUrl = localStorage.getItem(SHEET_URL_KEY) || '';
    } catch (e) {
      console.warn('저장 데이터 복원 실패, 기본값으로 초기화:', e);
      resetToDefaults();
    }
  }

  function saveData() {
    try {
      const dataToSave = {
        students: state.students,
        roles: state.roles,
        classTitle: state.classTitle,
        assignDate: state.assignDate,
        assignments: state.assignments
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('데이터 저장 에러:', e);
    }
  }

  function resetToDefaults() {
    state.students = [...DEFAULT_STUDENTS];
    state.roles = [...DEFAULT_ROLES];
    state.classTitle = '🌳 숲속 우리 반 1인 1역할 배정표';
    state.assignDate = new Date().toISOString().split('T')[0];
    
    state.assignments = state.roles.map((role, idx) => ({
      student: state.students[idx] || `친구 ${idx + 1}`,
      role: role
    }));

    saveData();
  }

  // ==========================================
  // 7. Fisher-Yates Random Shuffle 배정 로직
  // ==========================================
  function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function assignRolesWithAnimation() {
    if (state.isShuffling) return;

    if (state.students.length === 0 || state.roles.length === 0) {
      showToast('학생 명단 또는 역할이 비어있습니다. [명단·역할 관리]에서 추가해 주세요!', 'warn');
      return;
    }

    state.isShuffling = true;
    const btnAssign = document.getElementById('btnAssign');
    if (btnAssign) btnAssign.classList.add('loading');

    const shuffledStudents = shuffleArray(state.students);
    const shuffledRoles = shuffleArray(state.roles);

    const matchCount = Math.max(shuffledStudents.length, shuffledRoles.length);
    const tempCards = document.querySelectorAll('.role-card');
    tempCards.forEach(c => c.classList.add('shuffling'));

    let rollStep = 0;
    const totalRolls = 14;
    const rollInterval = 85;

    const intervalId = setInterval(() => {
      rollStep++;
      playTickSound();

      // 이름 깜빡임 효과
      const nameElements = document.querySelectorAll('.student-name-display');
      nameElements.forEach(el => {
        const randName = state.students[Math.floor(Math.random() * state.students.length)];
        el.innerHTML = `<span class="student-avatar">👤</span> ${randName}`;
      });

      if (rollStep >= totalRolls) {
        clearInterval(intervalId);

        // 최종 배정 확정
        const finalAssignments = [];
        for (let i = 0; i < matchCount; i++) {
          const student = shuffledStudents[i % shuffledStudents.length] || `미배정`;
          const role = shuffledRoles[i % shuffledRoles.length] || { id: i + 1, icon: '🌿', name: '자율 도우미', desc: '학급을 돕는 소중한 임무를 수행해요.' };
          finalAssignments.push({ student, role });
        }

        state.assignments = finalAssignments;
        state.isShuffling = false;
        if (btnAssign) btnAssign.classList.remove('loading');

        saveData();
        renderAllViews();
        playFanfare();
        triggerConfetti();

        // 상태 자막 갱신
        const statusSubtitle = document.getElementById('assignmentSubtitle');
        if (statusSubtitle) {
          statusSubtitle.textContent = `🍃 바람을 타고 총 ${finalAssignments.length}명의 친구들에게 역할이 정답게 배정되었습니다!`;
          statusSubtitle.style.color = '#1b4332';
          statusSubtitle.style.fontWeight = '700';
        }

        showToast('숲속 역할 배정이 완료되었습니다! 🍃', 'success');

        // 카드 팝업 애니메이션
        setTimeout(() => {
          document.querySelectorAll('.role-card').forEach(c => c.classList.add('pop-in'));
        }, 50);
      }
    }, rollInterval);
  }

  // ==========================================
  // 8. 렌더링 (Card Grid & Clean Table)
  // ==========================================
  function renderAllViews() {
    renderBadges();
    renderCardsGrid();
    renderTable();
    updatePrintHeaders();
  }

  function renderBadges() {
    const studentCountBadge = document.getElementById('studentCountBadge');
    const roleCountBadge = document.getElementById('roleCountBadge');
    const modalStudentCount = document.getElementById('modalStudentCount');
    const modalRoleCount = document.getElementById('modalRoleCount');
    const printStudentCount = document.getElementById('printStudentCount');

    const sCount = state.students.length;
    const rCount = state.roles.length;

    if (studentCountBadge) studentCountBadge.textContent = sCount;
    if (roleCountBadge) roleCountBadge.textContent = rCount;
    if (modalStudentCount) modalStudentCount.textContent = sCount;
    if (modalRoleCount) modalRoleCount.textContent = rCount;
    if (printStudentCount) printStudentCount.textContent = sCount;
  }

  function renderCardsGrid() {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (state.assignments.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #fdfaf3; border-radius: 16px; border: 2px dashed #bcaaa4;">
          <span style="font-size: 3rem; display: block; margin-bottom: 12px;">🌰</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #4a2e18; margin-bottom: 8px;">배정 대기 중</h3>
          <p style="color: #6f4e37; font-size: 0.95rem;">상단의 <strong>[🎲 역할 배정하기]</strong>를 누르면 숲속 동물들과 요정들이 카드를 건네줍니다.</p>
        </div>
      `;
      return;
    }

    state.assignments.forEach((item, index) => {
      const card = document.createElement('div');
      const colorIndex = index % 6;
      card.className = `role-card color-${colorIndex} assigned`;
      card.dataset.index = index;

      card.innerHTML = `
        <div class="card-top">
          <span class="card-order-badge">역할 #${index + 1}</span>
          <div class="card-icon">${item.role.icon || '🌿'}</div>
        </div>
        <h4 class="card-role-title">${item.role.name}</h4>
        <div class="assigned-student-box">
          <span class="student-label">담당 친구</span>
          <div class="student-name-display">
            <span class="student-avatar">👤</span>
            <span class="name-text">${item.student}</span>
          </div>
        </div>
        <p class="card-desc">🍃 ${item.role.desc || '숲속 교실을 위한 소중한 임무를 실천해요.'}</p>
      `;

      card.addEventListener('click', () => handleCardClick(index));
      grid.appendChild(card);
    });
  }

  function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (state.assignments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="td-center" style="padding: 24px; color: #94a3b8;">
            배정된 역할이 없습니다. 상단 [역할 배정하기]를 먼저 실행해 주세요.
          </td>
        </tr>
      `;
      return;
    }

    state.assignments.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="td-center"><strong>${index + 1}</strong></td>
        <td class="td-student">${item.student}</td>
        <td class="td-role">${item.role.icon || '🌿'} ${item.role.name}</td>
        <td class="td-desc">${item.role.desc || '-'}</td>
        <td class="td-check-box">
          <span class="check-square"></span>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function updatePrintHeaders() {
    const printTitle = document.getElementById('printClassTitle');
    const printDate = document.getElementById('printDateDisplay');
    const printTimestamp = document.getElementById('printTimestamp');

    if (printTitle) printTitle.textContent = state.classTitle;
    if (printDate) printDate.textContent = state.assignDate || new Date().toLocaleDateString('ko-KR');
    if (printTimestamp) {
      const now = new Date();
      printTimestamp.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
  }

  // ==========================================
  // 9. 카드 수동 맞교환 (Swap) 기능
  // ==========================================
  function handleCardClick(index) {
    if (state.isShuffling) return;

    const cards = document.querySelectorAll('.role-card');

    if (state.selectedCardIndex === null) {
      state.selectedCardIndex = index;
      cards[index].style.outline = '3px solid #2d6a4f';
      cards[index].style.transform = 'scale(1.03)';
      showToast(`${state.assignments[index].student} 친구가 선택되었습니다. 맞바꿀 다른 카드를 골라주세요.`, 'info');
    } else if (state.selectedCardIndex === index) {
      // 선택 취소
      cards[index].style.outline = 'none';
      cards[index].style.transform = 'none';
      state.selectedCardIndex = null;
    } else {
      // 맞바꾸기 실행
      const firstIdx = state.selectedCardIndex;
      const secondIdx = index;

      const tempStudent = state.assignments[firstIdx].student;
      state.assignments[firstIdx].student = state.assignments[secondIdx].student;
      state.assignments[secondIdx].student = tempStudent;

      state.selectedCardIndex = null;
      saveData();
      renderAllViews();
      playTickSound();
      showToast(`${state.assignments[firstIdx].student}님과 ${state.assignments[secondIdx].student}님의 역할이 정답게 교환되었습니다! 🤝`, 'success');
    }
  }

  // ==========================================
  // 10. A4 교실 게시판 인쇄 트리거
  // ==========================================
  function handlePrint() {
    if (state.assignments.length === 0) {
      showToast('배정된 결과가 없습니다. 먼저 [🎲 역할 배정하기]를 진행해 주세요.', 'warn');
      return;
    }
    updatePrintHeaders();
    window.print();
  }

  // ==========================================
  // 11. 클립보드 표 복사 (엑셀/한글 바로 붙여넣기)
  // ==========================================
  function handleCopyTable() {
    if (state.assignments.length === 0) {
      showToast('복사할 배정 결과가 없습니다. 먼저 배정해 주세요.', 'warn');
      return;
    }

    let text = `번호\t학생 이름\t담당 역할\t주요 임무\n`;
    state.assignments.forEach((item, idx) => {
      text += `${idx + 1}\t${item.student}\t${item.role.name}\t${item.role.desc}\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('엑셀이나 한글(HWP) 표에 바로 붙여넣을 수 있도록 복사되었습니다! 📋', 'success');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('클립보드에 표 데이터가 복사되었습니다! 📋', 'success');
  }

  // ==========================================
  // 12. 구글 스프레드시트 (Apps Script) 연동
  // ==========================================
  async function handleLoadFromSheet() {
    const url = state.sheetUrl || localStorage.getItem(SHEET_URL_KEY);
    if (!url) {
      openSheetModal();
      setSheetFeedback('구글 Apps Script Web App URL을 먼저 등록해 주세요. 아래 안내 코드를 시트에 붙여넣으면 즉시 연동됩니다!', 'info');
      return;
    }

    showToast('구글 스프레드시트에서 데이터를 가져오는 중입니다... 🔄', 'info');
    setSheetFeedback('시트 데이터 불러오는 중...', 'info');

    try {
      const response = await fetch(url + (url.includes('?') ? '&' : '?') + 'action=get');
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const data = await response.json();

      if (data && data.students && data.students.length > 0) {
        state.students = data.students;
      }
      if (data && data.roles && data.roles.length > 0) {
        state.roles = data.roles;
      }

      saveData();
      renderAllViews();
      showToast(`시트에서 친구 ${state.students.length}명, 역할 ${state.roles.length}개를 성공적으로 불러왔습니다! 🌿`, 'success');
      setSheetFeedback(`성공: 학생 ${state.students.length}명, 역할 ${state.roles.length}개 로드 완료!`, 'success');
    } catch (err) {
      console.error('시트 로드 실패:', err);
      showToast('시트 연결에 실패했습니다. Web App 배포 설정(액세스 권한: 모든 사용자)을 확인해 주세요.', 'warn');
      setSheetFeedback(`연결 오류: ${err.message}. Apps Script 배포 시 '액세스 권한: 모든 사용자(Anyone)'로 설정되어 있는지 확인하세요.`, 'error');
    }
  }

  async function handleSaveToSheet() {
    const url = state.sheetUrl || localStorage.getItem(SHEET_URL_KEY);
    if (!url) {
      openSheetModal();
      setSheetFeedback('구글 Apps Script Web App URL을 먼저 등록해 주세요.', 'info');
      return;
    }

    if (state.assignments.length === 0) {
      showToast('저장할 배정 결과가 없습니다. 먼저 역할을 배정해 주세요.', 'warn');
      return;
    }

    showToast('구글 스프레드시트에 저장하는 중입니다... 💾', 'info');
    setSheetFeedback('시트로 결과 저장 전송 중...', 'info');

    try {
      const payload = {
        action: 'save',
        classTitle: state.classTitle,
        assignDate: state.assignDate,
        assignments: state.assignments
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      showToast('구글 스프레드시트 [배정결과] 시트에 저장이 완료되었습니다! 💾', 'success');
      setSheetFeedback('성공: 구글 스프레드시트에 배정 결과가 기록되었습니다!', 'success');
    } catch (err) {
      console.error('시트 저장 실패:', err);
      showToast('시트 저장 중 오류가 발생했습니다. Apps Script 설정을 확인해 주세요.', 'warn');
      setSheetFeedback(`저장 오류: ${err.message}. CORS 또는 배포 권한 설정을 점검해 주세요.`, 'error');
    }
  }

  function setSheetFeedback(msg, type) {
    const fb = document.getElementById('sheetTestFeedback');
    if (!fb) return;
    fb.className = `sheet-feedback show ${type}`;
    fb.textContent = msg;
  }

  // ==========================================
  // 13. 모달 제어 (명단/역할 관리 & 시트 연동)
  // ==========================================
  const manageModal = document.getElementById('manageModal');
  const sheetModal = document.getElementById('sheetModal');

  function openManageModal() {
    if (!manageModal) return;
    manageModal.classList.add('open');
    manageModal.setAttribute('aria-hidden', 'false');
    renderManageLists();
  }

  function closeManageModal() {
    if (!manageModal) return;
    manageModal.classList.remove('open');
    manageModal.setAttribute('aria-hidden', 'true');
    saveData();
    renderAllViews();
  }

  function openSheetModal() {
    if (!sheetModal) return;
    sheetModal.classList.add('open');
    sheetModal.setAttribute('aria-hidden', 'false');
    const input = document.getElementById('appsScriptUrl');
    if (input) input.value = state.sheetUrl || localStorage.getItem(SHEET_URL_KEY) || '';
  }

  function closeSheetModal() {
    if (!sheetModal) return;
    sheetModal.classList.remove('open');
    sheetModal.setAttribute('aria-hidden', 'true');
  }

  function renderManageLists() {
    renderStudentsList();
    renderRolesList();
  }

  function renderStudentsList() {
    const list = document.getElementById('studentsList');
    if (!list) return;
    list.innerHTML = '';

    state.students.forEach((name, idx) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-info">
          <span style="font-weight: 700; color: #a89f91; width: 24px;">${idx + 1}.</span>
          <span>👤 ${name}</span>
        </div>
        <button class="item-delete-btn" title="삭제">&times;</button>
      `;

      row.querySelector('.item-delete-btn').addEventListener('click', () => {
        state.students.splice(idx, 1);
        renderManageLists();
        renderBadges();
      });

      list.appendChild(row);
    });

    renderBadges();
  }

  function renderRolesList() {
    const list = document.getElementById('rolesList');
    if (!list) return;
    list.innerHTML = '';

    state.roles.forEach((role, idx) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-info">
          <span style="font-weight: 700; color: #a89f91; width: 24px;">${idx + 1}.</span>
          <span style="font-size: 1.1rem;">${role.icon}</span>
          <div>
            <div style="font-weight: 700; color: #3e2723;">${role.name}</div>
            <div style="font-size: 0.78rem; color: #6f4e37;">${role.desc || ''}</div>
          </div>
        </div>
        <button class="item-delete-btn" title="삭제">&times;</button>
      `;

      row.querySelector('.item-delete-btn').addEventListener('click', () => {
        state.roles.splice(idx, 1);
        renderManageLists();
        renderBadges();
      });

      list.appendChild(row);
    });

    renderBadges();
  }

  // ==========================================
  // 14. 이벤트 리스너 바인딩
  // ==========================================
  function bindEvents() {
    // 1. Assign Button
    const btnAssign = document.getElementById('btnAssign');
    if (btnAssign) btnAssign.addEventListener('click', assignRolesWithAnimation);

    // 2. Reset Button
    const btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', () => {
      assignRolesWithAnimation();
    });

    // 3. Print Button
    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', handlePrint);

    // 4. Copy Table Button
    const btnCopyTable = document.getElementById('btnCopyTable');
    if (btnCopyTable) btnCopyTable.addEventListener('click', handleCopyTable);

    // 5. Sound Toggle
    const btnSoundToggle = document.getElementById('btnSoundToggle');
    const soundIcon = document.getElementById('soundIcon');
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        if (soundIcon) soundIcon.textContent = state.soundEnabled ? '🔔' : '🔕';
        showToast(state.soundEnabled ? '숲속 풍경소리가 켜졌습니다.' : '풍경소리가 꺼졌습니다.', 'info');
      });
    }

    // 6. View Switcher (Grid / Table)
    const viewGridBtn = document.getElementById('viewGridBtn');
    const viewTableBtn = document.getElementById('viewTableBtn');
    const cardsGrid = document.getElementById('cardsGrid');
    const printContainer = document.getElementById('printContainer');

    if (viewGridBtn && viewTableBtn && cardsGrid && printContainer) {
      viewGridBtn.addEventListener('click', () => {
        viewGridBtn.classList.add('active');
        viewTableBtn.classList.remove('active');
        cardsGrid.style.display = 'grid';
        printContainer.classList.remove('active-view');
        state.viewMode = 'grid';
      });

      viewTableBtn.addEventListener('click', () => {
        viewTableBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        cardsGrid.style.display = 'none';
        printContainer.classList.add('active-view');
        state.viewMode = 'table';
      });
    }

    // 7. Class Title & Date Edit
    const classTitle = document.getElementById('classTitle');
    if (classTitle) {
      classTitle.textContent = state.classTitle;
      classTitle.addEventListener('blur', () => {
        state.classTitle = classTitle.textContent.trim() || '🌳 숲속 우리 반 1인 1역할 배정표';
        saveData();
        updatePrintHeaders();
      });
    }

    const assignDate = document.getElementById('assignDate');
    if (assignDate) {
      assignDate.value = state.assignDate;
      assignDate.addEventListener('change', (e) => {
        state.assignDate = e.target.value;
        saveData();
        updatePrintHeaders();
      });
    }

    // 8. Management Modal Events
    const btnManageData = document.getElementById('btnManageData');
    const btnCloseManageModal = document.getElementById('btnCloseManageModal');
    const btnSaveDataModal = document.getElementById('btnSaveDataModal');
    if (btnManageData) btnManageData.addEventListener('click', openManageModal);
    if (btnCloseManageModal) btnCloseManageModal.addEventListener('click', closeManageModal);
    if (btnSaveDataModal) btnSaveDataModal.addEventListener('click', closeManageModal);

    // Modal Tabs
    const tabStudentsBtn = document.getElementById('tabStudentsBtn');
    const tabRolesBtn = document.getElementById('tabRolesBtn');
    const tabStudentsContent = document.getElementById('tabStudentsContent');
    const tabRolesContent = document.getElementById('tabRolesContent');

    if (tabStudentsBtn && tabRolesBtn && tabStudentsContent && tabRolesContent) {
      tabStudentsBtn.addEventListener('click', () => {
        tabStudentsBtn.classList.add('active');
        tabRolesBtn.classList.remove('active');
        tabStudentsContent.classList.add('active');
        tabRolesContent.classList.remove('active');
      });

      tabRolesBtn.addEventListener('click', () => {
        tabRolesBtn.classList.add('active');
        tabStudentsBtn.classList.remove('active');
        tabRolesContent.classList.add('active');
        tabStudentsContent.classList.remove('active');
      });
    }

    // Add Student
    const newStudentInput = document.getElementById('newStudentInput');
    const btnAddStudent = document.getElementById('btnAddStudent');
    function addStudent() {
      if (!newStudentInput) return;
      const name = newStudentInput.value.trim();
      if (!name) return;
      state.students.push(name);
      newStudentInput.value = '';
      renderStudentsList();
    }
    if (btnAddStudent) btnAddStudent.addEventListener('click', addStudent);
    if (newStudentInput) {
      newStudentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addStudent();
      });
    }

    // Batch Add Students
    const btnToggleBatchStudents = document.getElementById('btnToggleBatchStudents');
    const batchStudentsContainer = document.getElementById('batchStudentsContainer');
    const batchStudentsTextarea = document.getElementById('batchStudentsTextarea');
    const btnApplyBatchStudents = document.getElementById('btnApplyBatchStudents');
    const btnCancelBatchStudents = document.getElementById('btnCancelBatchStudents');

    if (btnToggleBatchStudents && batchStudentsContainer && batchStudentsTextarea) {
      btnToggleBatchStudents.addEventListener('click', () => {
        batchStudentsContainer.classList.toggle('hidden');
        if (!batchStudentsContainer.classList.contains('hidden')) {
          batchStudentsTextarea.value = state.students.join(', ');
          batchStudentsTextarea.focus();
        }
      });

      if (btnCancelBatchStudents) {
        btnCancelBatchStudents.addEventListener('click', () => {
          batchStudentsContainer.classList.add('hidden');
        });
      }

      if (btnApplyBatchStudents) {
        btnApplyBatchStudents.addEventListener('click', () => {
          const raw = batchStudentsTextarea.value;
          const list = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
          if (list.length > 0) {
            state.students = list;
            renderStudentsList();
            batchStudentsContainer.classList.add('hidden');
            showToast(`${list.length}명의 친구 명단이 적용되었습니다.`, 'success');
          }
        });
      }
    }

    // Add Role
    const newRoleIcon = document.getElementById('newRoleIcon');
    const newRoleName = document.getElementById('newRoleName');
    const newRoleDesc = document.getElementById('newRoleDesc');
    const btnAddRole = document.getElementById('btnAddRole');

    function addRole() {
      if (!newRoleName) return;
      const name = newRoleName.value.trim();
      if (!name) return;
      const icon = newRoleIcon ? newRoleIcon.value.trim() || '🌿' : '🌿';
      const desc = newRoleDesc ? newRoleDesc.value.trim() : '';

      state.roles.push({
        id: Date.now(),
        icon,
        name,
        desc
      });

      newRoleName.value = '';
      if (newRoleDesc) newRoleDesc.value = '';
      renderRolesList();
    }
    if (btnAddRole) btnAddRole.addEventListener('click', addRole);

    // Reset Defaults
    const btnResetDefaultData = document.getElementById('btnResetDefaultData');
    if (btnResetDefaultData) {
      btnResetDefaultData.addEventListener('click', () => {
        if (confirm('기본 예시 데이터(학생 12명, 학급 역할 12개)로 초기화하시겠습니까?')) {
          resetToDefaults();
          renderManageLists();
          renderAllViews();
          showToast('기본 예시 데이터로 복원되었습니다.', 'info');
        }
      });
    }

    // 9. Google Sheets Modal Events
    const btnLoadSheet = document.getElementById('btnLoadSheet');
    const btnSaveSheet = document.getElementById('btnSaveSheet');
    const btnSheetConfig = document.getElementById('btnSheetConfig');
    const btnCloseSheetModal = document.getElementById('btnCloseSheetModal');
    const btnCloseSheetModalBottom = document.getElementById('btnCloseSheetModalBottom');
    const btnSaveSheetUrl = document.getElementById('btnSaveSheetUrl');
    const btnTestLoad = document.getElementById('btnTestLoad');
    const btnTestSave = document.getElementById('btnTestSave');
    const btnCopyScriptCode = document.getElementById('btnCopyScriptCode');

    if (btnLoadSheet) btnLoadSheet.addEventListener('click', handleLoadFromSheet);
    if (btnSaveSheet) btnSaveSheet.addEventListener('click', handleSaveToSheet);
    if (btnSheetConfig) btnSheetConfig.addEventListener('click', openSheetModal);
    if (btnCloseSheetModal) btnCloseSheetModal.addEventListener('click', closeSheetModal);
    if (btnCloseSheetModalBottom) btnCloseSheetModalBottom.addEventListener('click', closeSheetModal);

    if (btnSaveSheetUrl) {
      btnSaveSheetUrl.addEventListener('click', () => {
        const input = document.getElementById('appsScriptUrl');
        if (input) {
          const val = input.value.trim();
          state.sheetUrl = val;
          localStorage.setItem(SHEET_URL_KEY, val);
          setSheetFeedback('Apps Script URL이 저장되었습니다!', 'success');
          showToast('URL이 성공적으로 저장되었습니다.', 'success');
        }
      });
    }

    if (btnTestLoad) btnTestLoad.addEventListener('click', handleLoadFromSheet);
    if (btnTestSave) btnTestSave.addEventListener('click', handleSaveToSheet);

    if (btnCopyScriptCode) {
      btnCopyScriptCode.addEventListener('click', () => {
        const code = document.getElementById('sampleScriptCode');
        if (code && navigator.clipboard) {
          navigator.clipboard.writeText(code.innerText).then(() => {
            showToast('Apps Script 샘플 코드가 복사되었습니다! 구글 시트 편집기에 붙여넣으세요.', 'success');
          });
        }
      });
    }

    // Close modals on overlay backdrop click
    [manageModal, sheetModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
          }
        });
      }
    });
  }

  // ==========================================
  // 15. 초기 구동 (DOM Ready)
  // ==========================================
  function init() {
    loadSavedData();
    bindEvents();
    renderAllViews();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
