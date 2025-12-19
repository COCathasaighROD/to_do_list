import { DateUtils } from './dateUtils.js';

export const UI = {
  elements: {
    currentDate: document.getElementById('current-date'),
    currentTime: document.getElementById('current-time'),
    navToday: document.getElementById('nav-today'),
    navHistory: document.getElementById('nav-history'),
    viewToday: document.getElementById('view-today'),
    viewHistory: document.getElementById('view-history'),
    newGoalInput: document.getElementById('new-goal-input'),
    addGoalBtn: document.getElementById('add-goal-btn'),
    goalsList: document.getElementById('goals-list'),
    timeBlocksContainer: document.getElementById('time-blocks-container'),
    historyList: document.getElementById('history-list'),
    // Modal elements
    modalOverlay: document.getElementById('task-modal-overlay'),
    modalTaskInput: document.getElementById('modal-task-input'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalSaveBtn: document.getElementById('modal-save-btn'),
  },

  // Grid Configuration
  gridStartHour: 8,
  gridEndHour: 18,
  slotHeight: 30, // px per 30 mins

  init() {
    this.renderGridStructure();
  },

  updateDateTime(date) {
    this.elements.currentDate.textContent = DateUtils.formatDate(date);
    this.elements.currentTime.textContent = DateUtils.formatTime(date);
  },

  toggleView(view) {
    if (view === 'today') {
      this.elements.viewToday.classList.remove('hidden');
      this.elements.viewToday.classList.add('active');
      this.elements.viewHistory.classList.add('hidden');
      this.elements.viewHistory.classList.remove('active');
      this.elements.navToday.classList.add('active');
      this.elements.navHistory.classList.remove('active');
    } else {
      this.elements.viewToday.classList.add('hidden');
      this.elements.viewToday.classList.remove('active');
      this.elements.viewHistory.classList.remove('hidden');
      this.elements.viewHistory.classList.add('active');
      this.elements.navToday.classList.remove('active');
      this.elements.navHistory.classList.add('active');
    }
  },

  renderGoals(goals, onToggle, onDelete) {
    this.elements.goalsList.innerHTML = '';
    goals.forEach(goal => {
      const li = document.createElement('li');
      li.className = `goal-item ${goal.completed ? 'completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = goal.completed;
      checkbox.addEventListener('change', () => onToggle(goal.id));

      const span = document.createElement('span');
      span.textContent = goal.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = 'Delete';
      deleteBtn.addEventListener('click', () => onDelete(goal.id));

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      this.elements.goalsList.appendChild(li);
    });
  },

  renderGridStructure() {
    this.elements.timeBlocksContainer.innerHTML = '';

    // Time Labels Column
    const labelsCol = document.createElement('div');
    labelsCol.className = 'grid-time-labels';

    for (let i = this.gridStartHour; i < this.gridEndHour; i++) {
      const label = document.createElement('div');
      label.className = 'grid-time-label';
      const timeLabel = i < 12 ? `${i} AM` : (i === 12 ? '12 PM' : `${i - 12} PM`);
      label.textContent = timeLabel;
      labelsCol.appendChild(label);
    }

    // Slots Container
    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'grid-slots-container';
    slotsContainer.id = 'grid-slots-container';

    // Create 30-min slots for interaction
    const totalSlots = (this.gridEndHour - this.gridStartHour) * 2;
    for (let i = 0; i < totalSlots; i++) {
      const slot = document.createElement('div');
      slot.className = 'grid-slot';
      slot.dataset.slotIndex = i;
      slotsContainer.appendChild(slot);
    }

    this.elements.timeBlocksContainer.appendChild(labelsCol);
    this.elements.timeBlocksContainer.appendChild(slotsContainer);
  },

  renderTimeBlocks(blocks, onDeleteBlock) {
    const container = document.getElementById('grid-slots-container');
    // Remove existing blocks
    const existingBlocks = container.querySelectorAll('.task-block');
    existingBlocks.forEach(el => el.remove());

    blocks.forEach(block => {
      const el = document.createElement('div');
      el.className = 'task-block';
      el.textContent = block.title;

      // Calculate position
      const startSlot = this.timeToSlotIndex(block.startTime);
      const endSlot = this.timeToSlotIndex(block.endTime);
      const durationSlots = endSlot - startSlot;

      el.style.top = `${startSlot * this.slotHeight}px`;
      el.style.height = `${durationSlots * this.slotHeight}px`;

      // Delete on click (simple interaction for now)
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${block.title}"?`)) {
          onDeleteBlock(block.id);
        }
      });

      container.appendChild(el);
    });
  },

  // Helper: Convert "09:30" to slot index (0-based from startHour)
  timeToSlotIndex(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = (hours - this.gridStartHour) * 60 + minutes;
    return Math.floor(totalMinutes / 30);
  },

  // Helper: Convert slot index to "09:30"
  slotIndexToTime(index) {
    const totalMinutes = index * 30;
    const hours = this.gridStartHour + Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  },

  showModal(onSave, onCancel) {
    this.elements.modalOverlay.classList.add('visible');
    this.elements.modalTaskInput.value = '';
    this.elements.modalTaskInput.focus();

    const saveHandler = () => {
      const text = this.elements.modalTaskInput.value.trim();
      if (text) {
        onSave(text);
        this.hideModal(saveHandler, cancelHandler);
      }
    };

    const cancelHandler = () => {
      onCancel();
      this.hideModal(saveHandler, cancelHandler);
    };

    this.elements.modalSaveBtn.onclick = saveHandler;
    this.elements.modalCancelBtn.onclick = cancelHandler;

    // Enter key to save
    this.elements.modalTaskInput.onkeypress = (e) => {
      if (e.key === 'Enter') saveHandler();
    };
  },

  hideModal(saveHandler, cancelHandler) {
    this.elements.modalOverlay.classList.remove('visible');
    this.elements.modalSaveBtn.onclick = null;
    this.elements.modalCancelBtn.onclick = null;
    this.elements.modalTaskInput.onkeypress = null;
  },

  renderHistory(historyData) {
    this.elements.historyList.innerHTML = '';
    if (historyData.length === 0) {
      this.elements.historyList.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No history available yet.</p>';
      return;
    }

    historyData.forEach(day => {
      const details = document.createElement('details');
      details.style.marginBottom = '1rem';
      details.style.padding = '1rem';
      details.style.backgroundColor = 'var(--bg-color)';
      details.style.borderRadius = 'var(--radius-md)';

      const summary = document.createElement('summary');
      summary.style.cursor = 'pointer';
      summary.style.fontWeight = '500';
      summary.textContent = DateUtils.formatDate(new Date(day.date));

      const content = document.createElement('div');
      content.style.marginTop = '1rem';

      // Goals summary
      const goalsTitle = document.createElement('h4');
      goalsTitle.textContent = 'Goals';
      goalsTitle.style.marginBottom = '0.5rem';
      content.appendChild(goalsTitle);

      const goalsList = document.createElement('ul');
      goalsList.style.listStyle = 'inside';
      goalsList.style.marginBottom = '1rem';
      day.data.goals.forEach(g => {
        const li = document.createElement('li');
        li.textContent = g.text;
        if (g.completed) li.style.textDecoration = 'line-through';
        goalsList.appendChild(li);
      });
      content.appendChild(goalsList);

      // Time blocks summary
      const blocksTitle = document.createElement('h4');
      blocksTitle.textContent = 'Time Blocks';
      blocksTitle.style.marginBottom = '0.5rem';
      content.appendChild(blocksTitle);

      const blocksList = document.createElement('ul');
      blocksList.style.listStyle = 'none';

      // Handle both old (object) and new (array) formats for history
      if (Array.isArray(day.data.timeBlocks)) {
        day.data.timeBlocks.forEach(block => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${block.startTime} - ${block.endTime}</strong>: ${block.title}`;
          blocksList.appendChild(li);
        });
      } else {
        Object.entries(day.data.timeBlocks).forEach(([time, task]) => {
          if (task) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${time}</strong>: ${task}`;
            blocksList.appendChild(li);
          }
        });
      }

      content.appendChild(blocksList);

      details.appendChild(summary);
      details.appendChild(content);
      this.elements.historyList.appendChild(details);
    });
  }
};
