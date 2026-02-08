// Constants
const DAILY_GOAL = 8 * 60 * 60 // 8 hours in seconds
const TOTAL_DAYS = 4
const STORAGE_KEY = "workTrackerData"

// State
let state = {
  currentTimer: null,
  startTime: null,
  pausedTime: 0,
  isRunning: false,
  isPaused: false,
  sessions: [],
  dailyData: {},
}

// DOM Elements
const elements = {
  timerDisplay: document.getElementById("timerDisplay"),
  currentDate: document.getElementById("currentDate"),
  sessionStatus: document.getElementById("sessionStatus"),
  progressBar: document.getElementById("progressBar"),
  todayProgress: document.getElementById("todayProgress"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  stopBtn: document.getElementById("stopBtn"),
  resetBtn: document.getElementById("resetBtn"),
  sessionHistory: document.getElementById("sessionHistory"),
  dailyHistory: document.getElementById("dailyHistory"),
  todayAnalysis: document.getElementById("todayAnalysis"),
  analysisContent: document.getElementById("analysisContent"),
  totalDays: document.getElementById("totalDays"),
  totalHours: document.getElementById("totalHours"),
  avgHours: document.getElementById("avgHours"),
  overallProgress: document.getElementById("overallProgress"),
}

// Utility Functions
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) {
    return `${h}h ${m}m`
  }
  return `${m}m`
}

function formatDate(date) {
  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ]
  const dayName = days[date.getDay()]
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${dayName}, ${day}/${month}/${year}`
}

function getDateKey(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getCurrentSeconds() {
  if (!state.isRunning) {
    return state.pausedTime
  }
  if (state.isPaused) {
    return state.pausedTime
  }
  // When running: pausedTime + elapsed since last start/resume
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
  return state.pausedTime + elapsed
}

// Storage Functions
function saveData() {
  const today = getDateKey()
  const todayTotal = getTodayTotal()

  if (!state.dailyData[today]) {
    state.dailyData[today] = {
      sessions: [],
      totalSeconds: 0,
    }
  }

  state.dailyData[today].sessions = state.sessions
  state.dailyData[today].totalSeconds = todayTotal

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      dailyData: state.dailyData,
      lastUpdate: new Date().toISOString(),
    }),
  )
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      state.dailyData = data.dailyData || {}

      // Load today's sessions
      const today = getDateKey()
      if (state.dailyData[today]) {
        state.sessions = state.dailyData[today].sessions || []
      }
    } catch (e) {
      console.error("Error loading data:", e)
    }
  }
}

function resetData() {
  if (
    confirm(
      "Bạn có chắc muốn xóa toàn bộ dữ liệu? Hành động này không thể hoàn tác.",
    )
  ) {
    localStorage.removeItem(STORAGE_KEY)
    state.dailyData = {}
    state.sessions = []
    state.pausedTime = 0
    stopTimer()
    updateUI()
  }
}

// Timer Functions
function startTimer() {
  if (state.isRunning) return

  state.isRunning = true
  state.isPaused = false
  state.startTime = Date.now()
  state.pausedTime = 0 // Reset về 0 khi start mới

  const newSession = {
    id: Date.now(),
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0,
    pauses: [],
  }
  state.sessions.push(newSession)

  state.currentTimer = setInterval(updateTimer, 1000)
  updateButtons()
  updateUI()
}

function pauseTimer() {
  if (!state.isRunning || state.isPaused) return

  // Lưu lại tổng thời gian hiện tại
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
  state.pausedTime = state.pausedTime + elapsed

  state.isPaused = true
  clearInterval(state.currentTimer)

  // Record pause
  const currentSession = state.sessions[state.sessions.length - 1]
  if (currentSession) {
    currentSession.pauses.push({
      startTime: new Date().toISOString(),
    })
  }

  updateButtons()
  updateUI()
  saveData()
}

function resumeTimer() {
  if (!state.isRunning || !state.isPaused) return

  state.isPaused = false
  // Reset startTime để bắt đầu đếm từ bây giờ
  // pausedTime đã chứa tổng thời gian trước đó
  state.startTime = Date.now()

  // End pause
  const currentSession = state.sessions[state.sessions.length - 1]
  if (currentSession && currentSession.pauses.length > 0) {
    const lastPause = currentSession.pauses[currentSession.pauses.length - 1]
    lastPause.endTime = new Date().toISOString()
  }

  state.currentTimer = setInterval(updateTimer, 1000)
  updateButtons()
  updateUI()
}

function stopTimer() {
  if (!state.isRunning) return

  clearInterval(state.currentTimer)
  const finalSeconds = getCurrentSeconds()

  // Update final session
  const currentSession = state.sessions[state.sessions.length - 1]
  if (currentSession) {
    currentSession.endTime = new Date().toISOString()
    currentSession.duration =
      finalSeconds -
      state.sessions.slice(0, -1).reduce((sum, s) => sum + s.duration, 0)
  }

  state.isRunning = false
  state.isPaused = false
  state.pausedTime = finalSeconds

  updateButtons()
  updateUI()
  saveData()
}

function updateTimer() {
  const seconds = getCurrentSeconds()
  elements.timerDisplay.textContent = formatTime(seconds)
  updateProgress()
}

// UI Update Functions
function updateButtons() {
  if (state.isRunning && !state.isPaused) {
    // Running state
    elements.startBtn.disabled = true
    elements.pauseBtn.disabled = false
    elements.stopBtn.disabled = false
    elements.sessionStatus.textContent = "Đang làm việc"
    elements.sessionStatus.classList.add("pulse")

    // Set pause button
    elements.pauseBtn.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/>
            </svg>
            Pause
        `
    elements.pauseBtn.onclick = handlePauseClick
  } else if (state.isRunning && state.isPaused) {
    // Paused state
    elements.startBtn.disabled = true
    elements.pauseBtn.disabled = false
    elements.stopBtn.disabled = false
    elements.sessionStatus.textContent = "Đang tạm dừng"
    elements.sessionStatus.classList.remove("pulse")

    // Set resume button
    elements.pauseBtn.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
            </svg>
            Resume
        `
    elements.pauseBtn.onclick = handleResumeClick
  } else {
    // Stopped state
    elements.startBtn.disabled = false
    elements.pauseBtn.disabled = true
    elements.stopBtn.disabled = true
    elements.sessionStatus.textContent =
      state.sessions.length > 0 ? "Đã hoàn thành" : "Chưa bắt đầu"
    elements.sessionStatus.classList.remove("pulse")

    // Reset pause button
    elements.pauseBtn.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/>
            </svg>
            Pause
        `
    elements.pauseBtn.onclick = handlePauseClick
  }
}

// Handler functions to prevent event conflicts
function handlePauseClick() {
  pauseTimer()
}

function handleResumeClick() {
  resumeTimer()
}

function updateProgress() {
  const todayTotal = getTodayTotal()
  const percentage = Math.min((todayTotal / DAILY_GOAL) * 100, 100)

  elements.progressBar.style.width = `${percentage}%`
  elements.todayProgress.textContent = `${percentage.toFixed(1)}%`
}

function getTodayTotal() {
  let total = 0
  state.sessions.forEach((session) => {
    if (session.endTime) {
      total += session.duration
    }
  })

  if (state.isRunning) {
    total = getCurrentSeconds()
  }

  return total
}

function renderSessionHistory() {
  if (state.sessions.length === 0) {
    elements.sessionHistory.innerHTML =
      '<p class="text-slate-500 text-center py-4">Chưa có phiên làm việc nào</p>'
    return
  }

  elements.sessionHistory.innerHTML = state.sessions
    .map((session, index) => {
      const isActive = state.isRunning && index === state.sessions.length - 1
      const isPaused = state.isPaused && index === state.sessions.length - 1
      const startTime = new Date(session.startTime)
      const endTime = session.endTime ? new Date(session.endTime) : null
      const duration = isActive
        ? getCurrentSeconds() -
          state.sessions.slice(0, -1).reduce((sum, s) => sum + s.duration, 0)
        : session.duration

      let statusClass = ""
      let statusText = ""
      if (isActive && !isPaused) {
        statusClass = "active"
        statusText = '<span class="badge badge-success">Đang chạy</span>'
      } else if (isPaused) {
        statusClass = "paused"
        statusText = '<span class="badge badge-warning">Tạm dừng</span>'
      } else {
        statusText = '<span class="badge badge-info">Hoàn thành</span>'
      }

      return `
            <div class="session-card ${statusClass}">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-semibold text-slate-800">Phiên ${index + 1}</div>
                        <div class="text-sm text-slate-600 mt-1">
                            ${startTime.toLocaleTimeString("vi-VN")} ${endTime ? `- ${endTime.toLocaleTimeString("vi-VN")}` : ""}
                        </div>
                        ${session.pauses.length > 0 ? `<div class="text-xs text-slate-500 mt-1">Tạm dừng: ${session.pauses.length} lần</div>` : ""}
                    </div>
                    <div class="text-right">
                        ${statusText}
                        <div class="font-bold text-lg text-slate-800 mt-1">${formatDuration(duration)}</div>
                    </div>
                </div>
            </div>
        `
    })
    .join("")
}

function renderDailyHistory() {
  const dates = Object.keys(state.dailyData)
    .sort()
    .reverse()
    .slice(0, TOTAL_DAYS)

  if (dates.length === 0) {
    elements.dailyHistory.innerHTML =
      '<p class="text-slate-500 text-center py-4">Chưa có dữ liệu</p>'
    return
  }

  elements.dailyHistory.innerHTML = dates
    .map((dateKey) => {
      const dayData = state.dailyData[dateKey]
      const date = new Date(dateKey)
      const totalSeconds = dayData.totalSeconds || 0
      const percentage = Math.min((totalSeconds / DAILY_GOAL) * 100, 100)
      const isCompleted = totalSeconds >= DAILY_GOAL
      const isToday = dateKey === getDateKey()

      return `
            <div class="day-card ${isCompleted ? "completed" : ""} ${isToday ? "in-progress" : ""}">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-semibold text-slate-800">${formatDate(date)}</div>
                        <div class="text-sm text-slate-600 mt-1">${dayData.sessions.length} phiên làm việc</div>
                    </div>
                    <div class="text-right">
                        ${
                          isCompleted
                            ? '<span class="badge badge-success">✓ Hoàn thành</span>'
                            : isToday
                              ? '<span class="badge badge-info">Hôm nay</span>'
                              : '<span class="badge badge-warning">Chưa đủ</span>'
                        }
                        <div class="font-bold text-lg text-slate-800 mt-1">${formatDuration(totalSeconds)}</div>
                    </div>
                </div>
                <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full ${isCompleted ? "bg-green-500" : "bg-blue-500"} transition-all" style="width: ${percentage}%"></div>
                </div>
                <div class="flex justify-between text-xs text-slate-500 mt-1">
                    <span>${percentage.toFixed(1)}% hoàn thành</span>
                    <span>${formatDuration(DAILY_GOAL - totalSeconds)} còn lại</span>
                </div>
            </div>
        `
    })
    .join("")
}

function analyzeToday() {
  const todayTotal = getTodayTotal()
  const percentage = (todayTotal / DAILY_GOAL) * 100
  const sessionCount = state.sessions.length

  if (todayTotal < 60) {
    elements.todayAnalysis.classList.add("hidden")
    return
  }

  elements.todayAnalysis.classList.remove("hidden")
  const analysis = []

  // Progress analysis
  if (percentage >= 100) {
    analysis.push({
      type: "positive",
      icon: "🎉",
      text: "Xuất sắc! Bạn đã hoàn thành mục tiêu 8 giờ hôm nay.",
    })
  } else if (percentage >= 75) {
    analysis.push({
      type: "positive",
      icon: "💪",
      text: `Rất tốt! Bạn đã hoàn thành ${percentage.toFixed(1)}% mục tiêu. Còn ${formatDuration(DAILY_GOAL - todayTotal)} nữa là đạt 8 giờ.`,
    })
  } else if (percentage >= 50) {
    analysis.push({
      type: "neutral",
      icon: "⚡",
      text: `Đã đạt ${percentage.toFixed(1)}% mục tiêu. Hãy tiếp tục phấn đấu!`,
    })
  } else {
    analysis.push({
      type: "negative",
      icon: "⏰",
      text: `Hiện tại mới ${percentage.toFixed(1)}% mục tiêu. Hãy cố gắng thêm nhé!`,
    })
  }

  // Session analysis
  if (sessionCount > 6) {
    analysis.push({
      type: "negative",
      icon: "🔄",
      text: `Bạn đã tạo ${sessionCount} phiên làm việc. Có vẻ bạn hay bị gián đoạn. Hãy thử tập trung vào các phiên dài hơn.`,
    })
  } else if (sessionCount >= 3 && sessionCount <= 6) {
    analysis.push({
      type: "neutral",
      icon: "✅",
      text: `${sessionCount} phiên làm việc là một nhịp độ hợp lý. Bạn biết cách cân bằng giữa làm việc và nghỉ ngơi.`,
    })
  } else if (sessionCount >= 1) {
    const avgDuration = todayTotal / sessionCount
    if (avgDuration >= 3600) {
      analysis.push({
        type: "positive",
        icon: "🎯",
        text: `Tuyệt vời! Mỗi phiên làm việc trung bình ${formatDuration(avgDuration)}. Bạn có khả năng tập trung cao.`,
      })
    }
  }

  // Time of day analysis
  const now = new Date()
  const currentHour = now.getHours()
  if (percentage < 50 && currentHour >= 18) {
    analysis.push({
      type: "negative",
      icon: "🌙",
      text: "Đã gần tối rồi nhưng bạn mới hoàn thành được một nửa. Hãy cố gắng thêm hoặc lên kế hoạch tốt hơn cho ngày mai!",
    })
  }

  elements.analysisContent.innerHTML = analysis
    .map(
      (item) => `
        <div class="analysis-item ${item.type}">
            <div class="text-2xl">${item.icon}</div>
            <div class="flex-1 text-sm text-slate-700">${item.text}</div>
        </div>
    `,
    )
    .join("")
}

function updateOverallStats() {
  const dates = Object.keys(state.dailyData)
  const completedDays = dates.filter(
    (date) => state.dailyData[date].totalSeconds >= DAILY_GOAL,
  ).length

  let totalSeconds = 0
  dates.forEach((date) => {
    totalSeconds += state.dailyData[date].totalSeconds || 0
  })

  const avgSeconds = dates.length > 0 ? totalSeconds / dates.length : 0
  const overallPercentage = ((completedDays / TOTAL_DAYS) * 100).toFixed(0)

  elements.totalDays.textContent = `${completedDays}/${TOTAL_DAYS}`
  elements.totalHours.textContent = formatDuration(totalSeconds)
  elements.avgHours.textContent = formatDuration(avgSeconds)
  elements.overallProgress.textContent = `${overallPercentage}%`
}

function updateUI() {
  elements.currentDate.textContent = formatDate(new Date())
  updateTimer()
  updateProgress()
  renderSessionHistory()
  renderDailyHistory()
  analyzeToday()
  updateOverallStats()
}

// Event Listeners
elements.startBtn.addEventListener("click", startTimer)
elements.stopBtn.addEventListener("click", stopTimer)
elements.resetBtn.addEventListener("click", resetData)
// Pause button listener is set dynamically in updateButtons()

// Initialize
loadData()
updateButtons()
updateUI()

// Auto-save every 30 seconds
setInterval(() => {
  if (state.isRunning) {
    saveData()
  }
}, 30000)
