import { UI } from './ui.js';
import { Storage } from './storage.js';
import { DateUtils } from './dateUtils.js';

class App {
  constructor() {
    this.state = {
      currentDate: new Date(),
      goals: [],
      timeBlocks: [], // Changed from object to array of {id, title, startTime, endTime}
      view: 'today'
    };

    this.dragState = {
      isDragging: false,
      startSlot: null,
      endSlot: null
    };

    this.init();
  }

  init() {
    UI.init(); // Initialize grid
    this.loadData();
    this.setupEventListeners();
    this.setupDragEvents();
    this.startClock();
    this.render();
  }

  loadData() {
    const dateKey = DateUtils.getStorageKey(this.state.currentDate);
    const data = Storage.getDayData(dateKey);
    this.state.goals = data.goals || [];

    // Migration: If old format (object), convert to new format (array)
    if (data.timeBlocks && !Array.isArray(data.timeBlocks)) {
      this.state.timeBlocks = Object.entries(data.timeBlocks)
        .filter(([_, val]) => val) // Remove empty
        .map(([time, title], index) => {
          // Assume 1 hour duration for old blocks
          const [h, m] = time.split(':').map(Number);
          const endH = h + 1;
          const endTime = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          return {
            id: Date.now() + index,
            title,
            startTime: time,
            endTime: endTime
          };
        });
    } else {
      this.state.timeBlocks = data.timeBlocks || [];
    }
  }

  saveData() {
    const dateKey = DateUtils.getStorageKey(this.state.currentDate);
    Storage.saveDayData(dateKey, {
      goals: this.state.goals,
      timeBlocks: this.state.timeBlocks
    });
  }

  setupEventListeners() {
    // Navigation
    UI.elements.navToday.addEventListener('click', () => {
      this.state.view = 'today';
      UI.toggleView('today');
    });

    UI.elements.navHistory.addEventListener('click', () => {
      this.state.view = 'history';
      this.loadHistory();
      UI.toggleView('history');
    });

    // Goals
    UI.elements.addGoalBtn.addEventListener('click', () => this.addGoal());
    UI.elements.newGoalInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addGoal();
    });
  }

  setupDragEvents() {
    const container = document.getElementById('grid-slots-container');

    container.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('grid-slot')) {
        this.dragState.isDragging = true;
        this.dragState.startSlot = parseInt(e.target.dataset.slotIndex);
        this.dragState.endSlot = this.dragState.startSlot;
        this.updateSelectionVisuals();
      }
    });

    container.addEventListener('mousemove', (e) => {
      if (this.dragState.isDragging && e.target.classList.contains('grid-slot')) {
        const currentSlot = parseInt(e.target.dataset.slotIndex);
        if (currentSlot !== this.dragState.endSlot) {
          this.dragState.endSlot = currentSlot;
          this.updateSelectionVisuals();
        }
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.dragState.isDragging) {
        this.dragState.isDragging = false;
        this.handleSelectionEnd();
      }
    });
  }

  updateSelectionVisuals() {
    const slots = document.querySelectorAll('.grid-slot');
    const start = Math.min(this.dragState.startSlot, this.dragState.endSlot);
    const end = Math.max(this.dragState.startSlot, this.dragState.endSlot);

    slots.forEach((slot, index) => {
      if (index >= start && index <= end) {
        slot.classList.add('selected');
      } else {
        slot.classList.remove('selected');
      }
    });
  }

  handleSelectionEnd() {
    // Show modal to create task
    UI.showModal(
      (taskTitle) => {
        this.addTimeBlock(taskTitle);
        this.clearSelection();
      },
      () => {
        this.clearSelection();
      }
    );
  }

  clearSelection() {
    const slots = document.querySelectorAll('.grid-slot');
    slots.forEach(slot => slot.classList.remove('selected'));
    this.dragState.startSlot = null;
    this.dragState.endSlot = null;
  }

  addTimeBlock(title) {
    const start = Math.min(this.dragState.startSlot, this.dragState.endSlot);
    const end = Math.max(this.dragState.startSlot, this.dragState.endSlot);

    // End slot is inclusive in selection, but exclusive in time (it's the start of the next block)
    // So we add 1 to the end index to get the end time
    const startTime = UI.slotIndexToTime(start);
    const endTime = UI.slotIndexToTime(end + 1);

    const newBlock = {
      id: Date.now(),
      title,
      startTime,
      endTime
    };

    this.state.timeBlocks.push(newBlock);
    this.saveData();
    this.render();
  }

  deleteTimeBlock(id) {
    this.state.timeBlocks = this.state.timeBlocks.filter(b => b.id !== id);
    this.saveData();
    this.render();
  }

  startClock() {
    const update = () => {
      const now = new Date();

      // Check for day change
      if (!DateUtils.isSameDay(now, this.state.currentDate)) {
        this.handleDayChange(now);
      }

      this.state.currentDate = now;
      UI.updateDateTime(now);
    };

    update(); // Initial call
    setInterval(update, 1000 * 60); // Update every minute
  }

  handleDayChange(newDate) {
    this.saveData();
    this.state.currentDate = newDate;
    this.state.goals = [];
    this.state.timeBlocks = [];
    this.loadData();
    this.render();
  }

  addGoal() {
    const text = UI.elements.newGoalInput.value.trim();
    if (!text) return;

    const newGoal = {
      id: Date.now(),
      text: text,
      completed: false
    };

    this.state.goals.push(newGoal);
    UI.elements.newGoalInput.value = '';
    this.saveData();
    this.render();
  }

  toggleGoal(id) {
    const goal = this.state.goals.find(g => g.id === id);
    if (goal) {
      goal.completed = !goal.completed;
      this.saveData();
      this.render();
    }
  }

  deleteGoal(id) {
    this.state.goals = this.state.goals.filter(g => g.id !== id);
    this.saveData();
    this.render();
  }

  loadHistory() {
    const historyDates = DateUtils.getPreviousWeekDates(new Date());
    const historyData = historyDates.map(date => {
      const dateKey = DateUtils.getStorageKey(date);
      const data = Storage.getDayData(dateKey);
      if (data.goals.length > 0 || (Array.isArray(data.timeBlocks) ? data.timeBlocks.length > 0 : Object.keys(data.timeBlocks).length > 0)) {
        return { date: dateKey, data };
      }
      return null;
    }).filter(item => item !== null);

    UI.renderHistory(historyData);
  }

  render() {
    if (this.state.view === 'today') {
      UI.renderGoals(
        this.state.goals,
        (id) => this.toggleGoal(id),
        (id) => this.deleteGoal(id)
      );
      UI.renderTimeBlocks(
        this.state.timeBlocks,
        (id) => this.deleteTimeBlock(id)
      );
    }
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
