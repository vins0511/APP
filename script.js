/**
 * 학급 1인 1역할 배정 도우미 - script.js (지브리 숲속 교실 & 빛남이들 에디션)
 * 
 * 주요 기능:
 * 1. 빛남이 12명 & 학급 역할 12개 기본 예시 데이터 탑재 (이전 역할 정보 포함)
 * 2. [🎲 역할 배정하기] 무작위 1:1 랜덤 매칭 + 직전 역할 중복 방지 알고리즘 + 풍경소리/오르골 멜로디 + 숲바람 파티클
 * 3. [🖨️ A4 게시판 인쇄] 이전 역할과 이번 역할을 비교 확인 가능한 정갈한 A4 교실 게시판 인쇄
 * 4. [🔄 시트 불러오기], [💾 시트에 결과 저장] 구글 스프레드시트 Apps Script 연동
 *    (다양한 시트 데이터 포맷, 배열, 객체, 한글 키 등 어떤 형태든 [object Object] 없이 깨끗한 한글 이름으로 완벽 추출)
 * 5. 카드 맞교환(스왑), 학생별 이전 역할 관리, 엑셀/한글 표 복사, localStorage 자동 저장
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 기본 예시 데이터 (이전 역할 정보 포함 12명 & 12개 역할)
  // ==========================================
  const DEFAULT_STUDENTS = [
    { name: '김민준', prevRole: '도서 대장 📚' },
    { name: '이서연', prevRole: '칠판 지킴이 🧹' },
    { name: '박도윤', prevRole: '우유 도우미 🥛' },
    { name: '최지우', prevRole: '식물 집사 🌱' },
    { name: '정예준', prevRole: '줄서기 반장 🚶‍♂️' },
    { name: '강하은', prevRole: '칭찬 배달부 💌' },
    { name: '조시우', prevRole: '에너지 지킴이 💡' },
    { name: '윤수아', prevRole: '분리수거 요원 ♻️' },
    { name: '장은우', prevRole: '체육 용구 대장 ⚽' },
    { name: '임지아', prevRole: '창문·환기 대장 🪟' },
    { name: '한서준', prevRole: '방역·위생 위원 ✨' },
    { name: '오다은', prevRole: '학습지 전달관 📄' }
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
  // 문자열 안전 추출 헬퍼 (어떤 객체/배열 형태든 [object Object] 방지)
  // ==========================================
  function getStudentName(val) {
    if (val === null || val === undefined) return '빛남이';

    // 1. 단순 문자열인 경우
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '' || trimmed === '[object Object]') return '빛남이';
      // "김민준(도서 대장)" 형태 분리
      const match = trimmed.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) return match[1].trim();
      return trimmed;
    }

    // 2. 숫자인 경우 (예: 출석번호만 있는 경우)
    if (typeof val === 'number') return String(val);

    // 3. 2차원 배열 형태인 경우: [["김민준"], ["이서연"]] or ["김민준", "도서 대장"]
    if (Array.isArray(val)) {
      for (let item of val) {
        const extracted = getStudentName(item);
        if (extracted && extracted !== '빛남이' && extracted !== '[object Object]') {
          return extracted;
        }
      }
      return '빛남이';
    }

    // 4. 객체인 경우 (시트에서 행 객체로 반환될 때의 다양한 키 확인)
    if (typeof val === 'object') {
      const priorityKeys = [
        'name', 'student', 'studentName', 'userName',
        '이름', '학생이름', '학생_이름', '학생', '성명',
        '빛남이', '빛남이이름', '0', 0, 'value', 'text'
      ];
      for (let key of priorityKeys) {
        if (val[key] !== undefined && val[key] !== null) {
          const res = getStudentName(val[key]);
          if (res && res !== '빛남이' && res !== '[object Object]') return res;
        }
      }

      // 다른 키들 중 문자열 값 검색 (prevRole, role 제외)
      for (let k in val) {
        if (Object.prototype.hasOwnProperty.call(val, k)) {
          if (k !== 'prevRole' && k !== 'role' && k !== 'id' && k !== '번호' && k !== 'desc') {
            const res = getStudentName(val[k]);
            if (res && res !== '빛남이' && res !== '[object Object]') return res;
          }
        }
      }
    }

    return '빛남이';
  }

  function getStudentPrevRole(val) {
    if (val === null || val === undefined) return '새 학기 🌱';

    // 1. 단순 문자열
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === '' || trimmed === '[object Object]') return '새 학기 🌱';
      const match = trimmed.match(/^.+?\s*\((.+?)\)$/);
      if (match) return match[1].trim();
      return trimmed;
    }

    // 2. 배열 형태인 경우 [이름, 이전역할]
    if (Array.isArray(val)) {
      if (val.length > 1) {
        const prev = getStudentPrevRole(val[1]);
        if (prev && prev !== '새 학기 🌱' && prev !== '[object Object]') return prev;
      }
      return '새 학기 🌱';
    }

    // 3. 객체인 경우
    if (typeof val === 'object') {
      const prevKeys = [
        'prevRole', 'prev_role', 'previousRole', 'previous_role',
        '이전역할', '이전_역할', '직전역할', '직전_역할', '이전 역할', '직전 역할',
        '과거역할', '기존역할', '1', 1, 'role', '역할'
      ];
      for (let key of prevKeys) {
        if (val[key] !== undefined && val[key] !== null) {
          if (typeof val[key] === 'string') {
            const trimmed = val[key].trim();
            if (trimmed && trimmed !== '[object Object]') return trimmed;
          } else if (typeof val[key] === 'object' && val[key].name) {
            return `${val[key].name} ${val[key].icon || ''}`.trim();
          }
        }
      }
    }

    return '새 학기 🌱';
  }

  // ==========================================
  // 2. 상태 관리 (State)
  // ==========================================
  let state = {
    students: [], // Array of { name: string, prevRole: string }
    roles: [],
    assignments: [], // Array of { student: string, prevRole: string, role: { id, icon, name, desc } }
    classTitle: '🌳 숲속 우리 반 1인 1역할 배정표',
    assignDate: new Date().toISOString().split('T')[0],
    viewMode: 'grid', // 'grid' | 'table'
    soundEnabled: true,
    sheetUrl: '',
    selectedCardIndex: null, // For manual swap
    isShuffling: false
  };

  // LocalStorage Keys
  const STORAGE_KEY = 'ghibli_class_role_assigner_v2';
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

  // 펜타토닉 풍경 음계 (Celesta / Wind Chime)
  const pentatonicScale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

  function playTickSound() {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';

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

      // 지브리 서정적 오르골 멜로디 아르페지오 (C5 - E5 - G5 - C6 - E6)
      const notes = [
        { f: 523.25, t: 0.00, d: 0.4 },
        { f: 659.25, t: 0.12, d: 0.4 },
        { f: 783.99, t: 0.24, d: 0.4 },
        { f: 1046.5, t: 0.38, d: 0.6 },
        { f: 1318.5, t: 0.52, d: 0.9 }
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
      p.vy += 0.22;
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
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'petal') {
          ctx.beginPath();
          ctx.arc(-p.size * 0.25, 0, p.size * 0.35, 0, Math.PI * 2);
          ctx.arc(p.size * 0.25, 0, p.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else {
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
    
    let icon = '✨';
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
        if (Array.isArray(parsed.students) && parsed.students.length > 0) {
          state.students = parsed.students.map((item, idx) => {
            const name = getStudentName(item);
            const prev = getStudentPrevRole(item);
            // [object Object] 복구
            if (!name || name === '[object Object]' || name === '빛남이') {
              const def = DEFAULT_STUDENTS[idx];
              return def ? { name: def.name, prevRole: def.prevRole } : { name: `빛남이 ${idx + 1}`, prevRole: '새 학기 🌱' };
            }
            return { name: name, prevRole: prev || '새 학기 🌱' };
          });
        } else {
          state.students = JSON.parse(JSON.stringify(DEFAULT_STUDENTS));
        }

        state.roles = Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : [...DEFAULT_ROLES];
        state.classTitle = parsed.classTitle || '🌳 숲속 우리 반 1인 1역할 배정표';
        
        if (Array.isArray(parsed.assignments) && parsed.assignments.length > 0) {
          state.assignments = parsed.assignments.map((asg, idx) => ({
            student: getStudentName(asg.student) || `빛남이 ${idx + 1}`,
            prevRole: getStudentPrevRole(asg.prevRole || asg),
            role: asg.role || state.roles[idx % state.roles.length]
          }));
        } else {
          syncDefaultAssignments();
        }

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

  function syncDefaultAssignments() {
    state.assignments = state.roles.map((role, idx) => {
      const studentObj = state.students[idx] || { name: `빛남이 ${idx + 1}`, prevRole: '새 학기 🌱' };
      return {
        student: getStudentName(studentObj),
        prevRole: getStudentPrevRole(studentObj),
        role: role
      };
    });
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
    state.students = JSON.parse(JSON.stringify(DEFAULT_STUDENTS));
    state.roles = [...DEFAULT_ROLES];
    state.classTitle = '🌳 숲속 우리 반 1인 1역할 배정표';
    state.assignDate = new Date().toISOString().split('T')[0];
    syncDefaultAssignments();
    saveData();
  }

  // ==========================================
  // 7. Fisher-Yates Random Shuffle & 이전 역할 중복 방지 로직
  // ==========================================
  function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function findBestRoleMatching(studentsList, rolesList, preventDup) {
    const count = Math.max(studentsList.length, rolesList.length);
    let bestRoles = shuffleArray(rolesList);

    if (!preventDup) {
      return bestRoles;
    }

    let minConflicts = 999;
    let optimalPermutation = bestRoles;

    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = shuffleArray(rolesList);
      let conflicts = 0;

      for (let i = 0; i < count; i++) {
        const student = studentsList[i % studentsList.length];
        const role = candidate[i % candidate.length];
        const prev = getStudentPrevRole(student);

        if (prev && role && prev.includes(role.name)) {
          conflicts++;
        }
      }

      if (conflicts === 0) {
        return candidate;
      }

      if (conflicts < minConflicts) {
        minConflicts = conflicts;
        optimalPermutation = candidate;
      }
    }

    return optimalPermutation;
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

    // 이전 배정 결과가 존재하면, 직전 역할을 현재 역할로 자동 아카이빙
    if (state.assignments.length > 0) {
      state.assignments.forEach(asg => {
        const targetStudent = state.students.find(s => getStudentName(s) === getStudentName(asg.student));
        if (targetStudent && asg.role) {
          targetStudent.prevRole = `${asg.role.name} ${asg.role.icon || ''}`.trim();
        }
      });
    }

    const preventDup = document.getElementById('preventDupCheckbox')?.checked ?? true;
    const shuffledStudents = shuffleArray(state.students);
    const assignedRoles = findBestRoleMatching(shuffledStudents, state.roles, preventDup);

    const matchCount = Math.max(shuffledStudents.length, assignedRoles.length);
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
        const randStudent = state.students[Math.floor(Math.random() * state.students.length)];
        el.innerHTML = `<span class="student-avatar">👤</span> ${getStudentName(randStudent)}`;
      });

      if (rollStep >= totalRolls) {
        clearInterval(intervalId);

        // 최종 배정 확정
        const finalAssignments = [];
        for (let i = 0; i < matchCount; i++) {
          const studentObj = shuffledStudents[i % shuffledStudents.length];
          const studentName = getStudentName(studentObj) || `빛남이 ${i + 1}`;
          const prevRole = getStudentPrevRole(studentObj);
          const role = assignedRoles[i % assignedRoles.length] || { id: i + 1, icon: '🌿', name: '자율 도우미', desc: '학급을 돕는 소중한 임무를 수행해요.' };

          finalAssignments.push({
            student: studentName,
            prevRole: prevRole,
            role: role
          });
        }

        state.assignments = finalAssignments;
        state.isShuffling = false;
        if (btnAssign) btnAssign.classList.remove('loading');

        saveData();
        renderAllViews();
        playFanfare();
        triggerConfetti();

        const statusSubtitle = document.getElementById('assignmentSubtitle');
        if (statusSubtitle) {
          statusSubtitle.textContent = `🍃 바람을 타고 총 ${finalAssignments.length}명의 빛남이들에게 역할이 정답게 배정되었습니다!`;
          statusSubtitle.style.color = '#1b4332';
          statusSubtitle.style.fontWeight = '700';
        }

        showToast('빛남이들의 숲속 역할 배정이 완료되었습니다! ✨', 'success');

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
          <p style="color: #6f4e37; font-size: 0.95rem;">상단의 <strong>[🎲 역할 배정하기]</strong>를 누르면 빛남이들에게 새 역할이 배정됩니다.</p>
        </div>
      `;
      return;
    }

    state.assignments.forEach((item, index) => {
      const card = document.createElement('div');
      const colorIndex = index % 6;
      card.className = `role-card color-${colorIndex} assigned`;
      card.dataset.index = index;

      const studentCleanName = getStudentName(item.student);
      const studentCleanPrev = getStudentPrevRole(item.prevRole || item);

      card.innerHTML = `
        <div class="card-top">
          <span class="card-order-badge">역할 #${index + 1}</span>
          <div class="card-icon">${item.role.icon || '🌿'}</div>
        </div>
        <h4 class="card-role-title">${item.role.name}</h4>
        
        <div class="assigned-student-box">
          <span class="student-label">담당 빛남이</span>
          <div class="student-name-display">
            <span class="student-avatar">👤</span>
            <span class="name-text">${studentCleanName}</span>
          </div>
        </div>

        <div class="card-prev-role">
          <span class="prev-role-label">⏳ 이전 역할</span>
          <span class="prev-role-value">${studentCleanPrev}</span>
        </div>

        <p class="card-desc">🍃 ${item.role.desc || '빛남이들의 교실을 위한 소중한 임무를 실천해요.'}</p>
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
          <td colspan="6" class="td-center" style="padding: 24px; color: #94a3b8;">
            배정된 역할이 없습니다. 상단 [역할 배정하기]를 먼저 실행해 주세요.
          </td>
        </tr>
      `;
      return;
    }

    state.assignments.forEach((item, index) => {
      const row = document.createElement('tr');
      const studentCleanName = getStudentName(item.student);
      const studentCleanPrev = getStudentPrevRole(item.prevRole || item);

      row.innerHTML = `
        <td class="td-center"><strong>${index + 1}</strong></td>
        <td class="td-student">${studentCleanName}</td>
        <td class="td-prev-role">${studentCleanPrev}</td>
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
  // 9. 카드 수동 맞교환 (Swap) 기능 (이전 역할도 함께 스왑)
  // ==========================================
  function handleCardClick(index) {
    if (state.isShuffling) return;

    const cards = document.querySelectorAll('.role-card');

    if (state.selectedCardIndex === null) {
      state.selectedCardIndex = index;
      cards[index].style.outline = '3px solid #2d6a4f';
      cards[index].style.transform = 'scale(1.03)';
      const sName = getStudentName(state.assignments[index].student);
      showToast(`${sName} 빛남이가 선택되었습니다. 맞바꿀 다른 카드를 골라주세요.`, 'info');
    } else if (state.selectedCardIndex === index) {
      cards[index].style.outline = 'none';
      cards[index].style.transform = 'none';
      state.selectedCardIndex = null;
    } else {
      const firstIdx = state.selectedCardIndex;
      const secondIdx = index;

      const tempStudent = state.assignments[firstIdx].student;
      const tempPrevRole = state.assignments[firstIdx].prevRole;

      state.assignments[firstIdx].student = state.assignments[secondIdx].student;
      state.assignments[firstIdx].prevRole = state.assignments[secondIdx].prevRole;

      state.assignments[secondIdx].student = tempStudent;
      state.assignments[secondIdx].prevRole = tempPrevRole;

      state.selectedCardIndex = null;
      saveData();
      renderAllViews();
      playTickSound();
      showToast(`${getStudentName(state.assignments[firstIdx].student)}님과 ${getStudentName(state.assignments[secondIdx].student)}님의 역할이 정답게 교환되었습니다! 🤝`, 'success');
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

    let text = `번호\t학생 이름\t이전 역할\t이번 담당 역할\t주요 임무\n`;
    state.assignments.forEach((item, idx) => {
      text += `${idx + 1}\t${getStudentName(item.student)}\t${getStudentPrevRole(item.prevRole || item)}\t${item.role.name}\t${item.role.desc}\n`;
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
  // 12. 구글 스프레드시트 (Apps Script) 연동 및 완벽 복원 파서
  // ==========================================
  function parseRoleObj(rawRole, defaultId) {
    if (!rawRole) return null;
    let icon = '🌿';
    let name = '';
    let desc = '';

    if (typeof rawRole === 'string') {
      const trimmed = rawRole.trim();
      const match = trimmed.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Extended_Pictographic}|\S+)\s+(.+)$/u);
      if (match) {
        icon = match[1];
        name = match[2].trim();
      } else {
        name = trimmed;
      }
    } else if (Array.isArray(rawRole)) {
      icon = rawRole[0] ? String(rawRole[0]).trim() : '🌿';
      name = rawRole[1] ? String(rawRole[1]).trim() : `역할 ${defaultId}`;
      desc = rawRole[2] ? String(rawRole[2]).trim() : '';
    } else if (typeof rawRole === 'object') {
      icon = rawRole.icon || rawRole.emoji || rawRole['아이콘'] || rawRole['이모지'] || '🌿';
      name = rawRole.name || rawRole.role || rawRole['역할'] || rawRole['역할명'] || rawRole['역할이름'] || '';
      desc = rawRole.desc || rawRole.description || rawRole['설명'] || rawRole['임무'] || rawRole['역할설명'] || '';
      if (typeof name === 'string') {
        const match = name.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Extended_Pictographic}|\S+)\s+(.+)$/u);
        if (match && (!icon || icon === '🌿')) {
          icon = match[1];
          name = match[2].trim();
        }
      }
    }

    if (!name || name === '역할' || name === '담당 역할' || name === '역할명' || name === '[object Object]') {
      return null;
    }

    // 기본 역할 정보가 있다면 아이콘과 설명 자동 보강
    const foundDefault = DEFAULT_ROLES.find(dr => dr.name === name || name.includes(dr.name) || dr.name.includes(name));
    if (foundDefault) {
      if (!icon || icon === '🌿') icon = foundDefault.icon;
      if (!desc) desc = foundDefault.desc;
    }

    return {
      id: defaultId,
      icon: icon || '🌿',
      name: name,
      desc: desc || ''
    };
  }

  function parseAssignmentFromItem(item, idx) {
    if (!item) return null;

    let sName = '';
    let prevRole = '새 학기 🌱';
    let rName = '';
    let rIcon = '🌿';
    let rDesc = '';

    // 케이스 1: 스프레드시트 1개 행 배열 형태
    if (Array.isArray(item)) {
      const cells = item.map(c => (c !== null && c !== undefined ? String(c).trim() : ''));
      if (cells.length === 0 || cells.every(c => c === '')) return null;

      // 헤더 행 건너뛰기
      if (cells.includes('학생 이름') || cells.includes('이름') || (cells.includes('번호') && cells.includes('담당 역할'))) {
        return null;
      }

      // 첫 열이 번호(숫자)인 경우
      const firstIsNum = !isNaN(Number(cells[0])) && cells[0] !== '';
      if (firstIsNum) {
        // [번호(0), 학생이름(1), 이전역할(2), 담당역할(3), 설명(4)]
        sName = cells[1];
        if (cells.length >= 4) {
          prevRole = cells[2] || '새 학기 🌱';
          rName = cells[3];
          rDesc = cells[4] || '';
        } else if (cells.length === 3) {
          rName = cells[2];
        }
      } else {
        // [학생이름(0), 이전역할(1), 담당역할(2), 설명(3)] 또는 [학생이름(0), 담당역할(1)]
        sName = cells[0];
        if (cells.length >= 3) {
          prevRole = cells[1] || '새 학기 🌱';
          rName = cells[2];
          rDesc = cells[3] || '';
        } else if (cells.length === 2) {
          rName = cells[1];
        }
      }
    } 
    // 케이스 2: 행 객체 형태
    else if (typeof item === 'object') {
      sName = getStudentName(
        item.student || item.name || item['학생 이름'] || item['학생이름'] || item['이름'] || item['성명'] || item['빛남이']
      );

      prevRole = getStudentPrevRole(
        item.prevRole || item['이전 역할'] || item['이전역할'] || item['직전 역할'] || item['직전역할'] || item
      );

      const rawRole = item.role || item['담당 역할'] || item['이번 담당 역할'] || item['역할'] || item['역할명'] || item['배정역할'];
      if (rawRole) {
        const parsedR = parseRoleObj(rawRole, idx + 1);
        if (parsedR) {
          rName = parsedR.name;
          rIcon = parsedR.icon;
          rDesc = parsedR.desc;
        }
      }

      if (!rDesc && (item['역할 설명'] || item['설명'] || item['임무'] || item.desc)) {
        rDesc = String(item['역할 설명'] || item['설명'] || item['임무'] || item.desc || '').trim();
      }
    }

    if (!sName || sName === '학생 이름' || sName === '이름' || sName === '번호' || sName === '[object Object]') {
      return null;
    }

    if (!rName || rName === '담당 역할' || rName === '역할' || rName === '역할명') {
      return null;
    }

    const roleObj = parseRoleObj(rName, idx + 1) || {
      id: idx + 1,
      icon: rIcon || '🌿',
      name: rName,
      desc: rDesc || ''
    };
    if (rDesc) roleObj.desc = rDesc;

    return {
      student: sName,
      prevRole: prevRole || '새 학기 🌱',
      role: roleObj
    };
  }

  function parseSheetResponse(data) {
    let assignments = [];
    let students = [];
    let roles = [];

    // 1. assignments 배열이 직접 온 경우
    if (data && typeof data === 'object' && Array.isArray(data.assignments) && data.assignments.length > 0) {
      data.assignments.forEach((item, idx) => {
        const parsed = parseAssignmentFromItem(item, idx);
        if (parsed) assignments.push(parsed);
      });
    }

    // 2. data 자체가 배열이거나 data.data, data.values, data.rows 가 배열인 경우 (행 단위 배정 결과 탐색)
    if (assignments.length === 0) {
      let rowList = null;
      if (Array.isArray(data)) {
        rowList = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) rowList = data.data;
        else if (Array.isArray(data.values)) rowList = data.values;
        else if (Array.isArray(data.rows)) rowList = data.rows;
      }

      if (rowList && rowList.length > 0) {
        rowList.forEach((row, idx) => {
          const parsed = parseAssignmentFromItem(row, idx);
          if (parsed) assignments.push(parsed);
        });
      }
    }

    // 3. 학생과 역할이 1:1 매칭된 배정 결과를 찾은 경우 (시트 배정 결과 완벽 동기화)
    if (assignments.length > 0) {
      students = assignments.map(asg => ({
        name: asg.student,
        prevRole: asg.prevRole || '새 학기 🌱'
      }));

      const roleMap = new Map();
      assignments.forEach(asg => {
        if (asg.role && asg.role.name && !roleMap.has(asg.role.name)) {
          roleMap.set(asg.role.name, asg.role);
        }
      });
      roles = Array.from(roleMap.values());

      if (data && typeof data === 'object' && Array.isArray(data.roles)) {
        data.roles.forEach((r, idx) => {
          const parsedRole = parseRoleObj(r, roles.length + idx + 1);
          if (parsedRole && parsedRole.name && !roleMap.has(parsedRole.name)) {
            roleMap.set(parsedRole.name, parsedRole);
            roles.push(parsedRole);
          }
        });
      }

      return { assignments, students, roles, isPaired: true };
    }

    // 4. 배정 결과가 아닌 단순 학생 명단과 역할 명단 분리형 데이터인 경우
    let rawStudents = (data && typeof data === 'object' && Array.isArray(data.students)) ? data.students : [];
    let rawRoles = (data && typeof data === 'object' && Array.isArray(data.roles)) ? data.roles : [];

    students = rawStudents.map((item, idx) => {
      const name = getStudentName(item);
      const prev = getStudentPrevRole(item);
      return {
        name: name && name !== '빛남이' ? name : `빛남이 ${idx + 1}`,
        prevRole: prev || '새 학기 🌱'
      };
    }).filter(s => s.name && s.name !== '[object Object]');

    roles = rawRoles.map((r, idx) => parseRoleObj(r, idx + 1)).filter(r => r && r.name && r.name !== '[object Object]');

    return { assignments: [], students, roles, isPaired: false };
  }

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

      const parsedResult = parseSheetResponse(data);

      // 케이스 A: 시트에 이미 아이들과 배정된 역할 데이터가 들어있는 경우 -> 정확히 복원!
      if (parsedResult.isPaired && parsedResult.assignments.length > 0) {
        state.assignments = parsedResult.assignments;
        state.students = parsedResult.students;
        if (parsedResult.roles.length > 0) {
          state.roles = parsedResult.roles;
        }

        saveData();
        renderAllViews();

        const subtitle = document.getElementById('assignmentSubtitle');
        if (subtitle) {
          subtitle.textContent = `📋 구글 스프레드시트에서 ${state.assignments.length}명의 배정 결과를 그대로 불러왔습니다!`;
          subtitle.style.color = '#1b4332';
          subtitle.style.fontWeight = '700';
        }

        showToast(`시트에서 ${state.assignments.length}명의 학생과 배정된 역할을 완벽하게 불러왔습니다! 🌿`, 'success');
        setSheetFeedback(`성공: 학생 ${state.assignments.length}명과 배정된 역할이 정확히 동기화되었습니다!`, 'success');
        return;
      }

      // 케이스 B: 분리된 학생 명단 및 역할 목록인 경우
      if (parsedResult.students.length > 0) {
        state.students = parsedResult.students;
      }
      if (parsedResult.roles.length > 0) {
        state.roles = parsedResult.roles;
      }

      // 기존 역할과 학생을 1:1 매칭
      state.assignments = state.roles.map((role, idx) => {
        const studentObj = state.students[idx] || { name: `빛남이 ${idx + 1}`, prevRole: '새 학기 🌱' };
        return {
          student: getStudentName(studentObj),
          prevRole: getStudentPrevRole(studentObj),
          role: role
        };
      });

      saveData();
      renderAllViews();
      showToast(`시트에서 빛남이 ${state.students.length}명, 역할 ${state.roles.length}개를 불러왔습니다! 🌿`, 'success');
      setSheetFeedback(`성공: 학생 ${state.students.length}명, 역할 ${state.roles.length}개 로드 완료!`, 'success');
    } catch (err) {
      console.error('시트 로드 실패:', err);
      showToast('시트 연결에 실패했습니다. Web App 배포 설정을 확인해 주세요.', 'warn');
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
        assignments: state.assignments.map((item, idx) => ({
          student: getStudentName(item.student),
          prevRole: getStudentPrevRole(item.prevRole || item),
          role: {
            id: item.role ? item.role.id : idx + 1,
            icon: item.role ? item.role.icon : '🌿',
            name: item.role ? item.role.name : '',
            desc: item.role ? item.role.desc : ''
          }
        }))
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

    state.students.forEach((studentObj, idx) => {
      const name = getStudentName(studentObj);
      const prev = getStudentPrevRole(studentObj);

      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-info" style="flex: 1;">
          <span style="font-weight: 700; color: #a89f91; width: 22px;">${idx + 1}.</span>
          <span style="font-weight: 700;">👤 ${name}</span>
          <span style="font-size: 0.8rem; color: #8c5836; background: #fdf6ec; border: 1px dashed #d6c7b2; padding: 2px 7px; border-radius: 4px; margin-left: 8px;">
            이전: ${prev}
          </span>
        </div>
        <button class="item-edit-prev-btn" style="background:none; border:none; color:#2d6a4f; cursor:pointer; font-size:0.8rem; margin-right:8px;" title="이전 역할 수정">✏️수정</button>
        <button class="item-delete-btn" title="삭제">&times;</button>
      `;

      row.querySelector('.item-edit-prev-btn').addEventListener('click', () => {
        const newPrev = prompt(`${name} 빛남이의 이전 역할을 입력하세요:`, prev);
        if (newPrev !== null) {
          studentObj.prevRole = newPrev.trim() || '새 학기 🌱';
          renderStudentsList();
        }
      });

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
    const btnAssign = document.getElementById('btnAssign');
    if (btnAssign) btnAssign.addEventListener('click', assignRolesWithAnimation);

    const btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', () => {
      assignRolesWithAnimation();
    });

    const btnPrint = document.getElementById('btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', handlePrint);

    const btnCopyTable = document.getElementById('btnCopyTable');
    if (btnCopyTable) btnCopyTable.addEventListener('click', handleCopyTable);

    const btnSoundToggle = document.getElementById('btnSoundToggle');
    const soundIcon = document.getElementById('soundIcon');
    if (btnSoundToggle) {
      btnSoundToggle.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        if (soundIcon) soundIcon.textContent = state.soundEnabled ? '🔔' : '🔕';
        showToast(state.soundEnabled ? '풍경소리가 켜졌습니다.' : '풍경소리가 꺼졌습니다.', 'info');
      });
    }

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

    const btnManageData = document.getElementById('btnManageData');
    const btnCloseManageModal = document.getElementById('btnCloseManageModal');
    const btnSaveDataModal = document.getElementById('btnSaveDataModal');
    if (btnManageData) btnManageData.addEventListener('click', openManageModal);
    if (btnCloseManageModal) btnCloseManageModal.addEventListener('click', closeManageModal);
    if (btnSaveDataModal) btnSaveDataModal.addEventListener('click', closeManageModal);

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

    const newStudentInput = document.getElementById('newStudentInput');
    const btnAddStudent = document.getElementById('btnAddStudent');
    function addStudent() {
      if (!newStudentInput) return;
      const name = newStudentInput.value.trim();
      if (!name) return;
      state.students.push({ name: name, prevRole: '새 학기 🌱' });
      newStudentInput.value = '';
      renderStudentsList();
    }
    if (btnAddStudent) btnAddStudent.addEventListener('click', addStudent);
    if (newStudentInput) {
      newStudentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addStudent();
      });
    }

    const btnToggleBatchStudents = document.getElementById('btnToggleBatchStudents');
    const batchStudentsContainer = document.getElementById('batchStudentsContainer');
    const batchStudentsTextarea = document.getElementById('batchStudentsTextarea');
    const btnApplyBatchStudents = document.getElementById('btnApplyBatchStudents');
    const btnCancelBatchStudents = document.getElementById('btnCancelBatchStudents');

    if (btnToggleBatchStudents && batchStudentsContainer && batchStudentsTextarea) {
      btnToggleBatchStudents.addEventListener('click', () => {
        batchStudentsContainer.classList.toggle('hidden');
        if (!batchStudentsContainer.classList.contains('hidden')) {
          batchStudentsTextarea.value = state.students.map(s => {
            const n = getStudentName(s);
            const p = getStudentPrevRole(s);
            return p && p !== '새 학기 🌱' ? `${n}(${p})` : n;
          }).join(', ');
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
            state.students = list.map(item => {
              const match = item.match(/^(.+?)\((.+?)\)$/);
              if (match) {
                return { name: match[1].trim(), prevRole: match[2].trim() };
              }
              return { name: item, prevRole: '새 학기 🌱' };
            });
            renderStudentsList();
            batchStudentsContainer.classList.add('hidden');
            showToast(`${list.length}명의 빛남이 명단이 적용되었습니다.`, 'success');
          }
        });
      }
    }

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

    const btnResetDefaultData = document.getElementById('btnResetDefaultData');
    if (btnResetDefaultData) {
      btnResetDefaultData.addEventListener('click', () => {
        if (confirm('기본 예시 데이터(빛남이 12명, 이전 역할, 학급 역할 12개)로 초기화하시겠습니까?')) {
          resetToDefaults();
          renderManageLists();
          renderAllViews();
          showToast('기본 예시 데이터로 복원되었습니다.', 'info');
        }
      });
    }

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
