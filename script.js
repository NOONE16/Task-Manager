document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    // Views and Tabs
    const tasksView = document.getElementById('tasks-view');
    const meetingsView = document.getElementById('meetings-view');
    const tabTasks = document.getElementById('tab-tasks');
    const tabMeetings = document.getElementById('tab-meetings');

    const teammateSelect = document.getElementById('teammate-select');
    const taskList = document.getElementById('task-list');
    const taskListHeader = document.getElementById('task-list-header');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    
    // Teammate Modal Elements
    const manageTeammatesBtn = document.getElementById('manage-teammates-btn');
    const teammateModal = document.getElementById('teammate-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const newTeammateInput = document.getElementById('new-teammate-input');
    const addTeammateBtn = document.getElementById('add-teammate-btn');
    const teammateList = document.getElementById('teammate-list');

    // Meeting Modal Elements
    const addMeetingBtn = document.getElementById('add-meeting-btn');
    const meetingModal = document.getElementById('meeting-modal');
    const closeMeetingModalBtn = document.getElementById('close-meeting-modal-btn');
    const meetingModalTitle = document.getElementById('meeting-modal-title');
    const meetingTitleInput = document.getElementById('meeting-title-input');
    const meetingSummaryInput = document.getElementById('meeting-summary-input');
    const saveMeetingBtn = document.getElementById('save-meeting-btn');
    const meetingList = document.getElementById('meeting-list');
    const meetingListHeader = document.getElementById('meeting-list-header');

    // --- APP STATE ---
    let state = {
        tasks: [],
        teammates: [],
        meetings: [],
        activeView: 'tasks', // 'tasks' or 'meetings'
    };
    const statuses = ['In Progress', 'Complete', 'Reject'];

    // --- DATA HANDLING ---
    const loadState = () => {
        const storedTasks = localStorage.getItem('tasks');
        state.tasks = storedTasks ? JSON.parse(storedTasks) : [];
        const storedTeammates = localStorage.getItem('teammates');
        state.teammates = storedTeammates ? JSON.parse(storedTeammates) : ['Sanjay', 'Subhasmit', 'Tanmay', 'Vishal', 'Siddhesh', 'Saurabh', 'Aninda', 'Naveen', 'Raktika']; // Default if none
        const storedMeetings = localStorage.getItem('meetings');
        state.meetings = storedMeetings ? JSON.parse(storedMeetings) : [];
    };

    const saveState = () => {
        localStorage.setItem('tasks', JSON.stringify(state.tasks));
        localStorage.setItem('teammates', JSON.stringify(state.teammates));
        localStorage.setItem('meetings', JSON.stringify(state.meetings));
    };

    // --- DATE UTILITIES ---
    const getTodayString = () => {
        return new Date().toISOString().split('T')[0];
    };

    // --- RENDER FUNCTIONS ---
    const renderAll = () => {
        if (state.activeView === 'tasks') {
            renderTeammates(); // Also populates the dropdown
            renderTasks();
        } else {
            renderMeetings();
        }
    };

    const renderTeammates = () => {
        // Populate select dropdown
        const currentTeammate = teammateSelect.value;
        teammateSelect.innerHTML = '';
        if (state.teammates.length === 0) {
            teammateSelect.innerHTML = '<option>Add a teammate first</option>';
        }
        state.teammates.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            teammateSelect.appendChild(option);
        });
        if (state.teammates.includes(currentTeammate)) {
            teammateSelect.value = currentTeammate;
        }

        // Populate management list in modal
        teammateList.innerHTML = '';
        state.teammates.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Remove';
            deleteBtn.onclick = () => deleteTeammate(name);
            li.appendChild(deleteBtn);
            teammateList.appendChild(li);
        });
    };

    const renderTasks = () => {
        const selectedTeammate = teammateSelect.value;
        const selectedDateStr = document.querySelector('.date-picker').value;
        const selectedDate = new Date(selectedDateStr + 'T00:00:00');

        taskList.innerHTML = ''; // Clear current list

        // Update header
        const headerDate = new Date(selectedDate);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        taskListHeader.textContent = `Tasks for ${headerDate.toLocaleDateString(undefined, options)}`;

        // 1. Get tasks for the selected date
        const dailyTasks = state.tasks.filter(task => 
            task.teammate === selectedTeammate && task.date === selectedDateStr
        );

        // 2. Get carry-over tasks (In Progress from previous days)
        const carryOverTasks = state.tasks.filter(task => {
            const taskDate = new Date(task.date + 'T00:00:00');
            return task.teammate === selectedTeammate &&
                   task.status === 'In Progress' &&
                   taskDate < selectedDate;
        });

        // Combine and remove duplicates (preferring the one on the current day if it exists)
        const allVisibleTasks = [...dailyTasks];
        carryOverTasks.forEach(carryTask => {
            if (!dailyTasks.some(dailyTask => dailyTask.id === carryTask.id)) {
                allVisibleTasks.push(carryTask);
            }
        });

        if (allVisibleTasks.length === 0 && state.teammates.length > 0) {
            const li = document.createElement('li');
            li.className = 'no-tasks-message';
            li.textContent = 'No tasks for this day. Great job! 🎉';
            taskList.appendChild(li);
            return;
        }

        allVisibleTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item status-${task.status.toLowerCase().replace(' ', '-')}`;
            li.dataset.taskId = task.id;

            const descriptionSpan = document.createElement('span');
            descriptionSpan.className = 'description';
            descriptionSpan.textContent = task.description;
            
            // Add date for carry-over tasks
            if (task.date !== selectedDateStr) {
                descriptionSpan.textContent += ` (from ${task.date})`;
            }
            descriptionSpan.onclick = () => startEditingTask(li, descriptionSpan, task.id);

            const statusSelect = document.createElement('select');
            statusSelect.className = 'status-select';
            statuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = status;
                if (status === task.status) {
                    option.selected = true;
                }
                statusSelect.appendChild(option);
            });

            statusSelect.addEventListener('change', (e) => {
                updateTaskStatus(task.id, e.target.value);
            });

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'task-actions';
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&#128465;'; // Trash can icon
            deleteBtn.title = 'Delete Task';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => deleteTask(task.id);
            actionsDiv.appendChild(deleteBtn);

            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'task-controls';
            controlsDiv.appendChild(statusSelect);
            controlsDiv.appendChild(actionsDiv);

            li.appendChild(descriptionSpan);
            li.appendChild(controlsDiv);
            taskList.appendChild(li);
        });
    };

    const renderMeetings = () => {
        const selectedDateStr = document.querySelector('.date-picker').value;
        meetingList.innerHTML = '';

        const headerDate = new Date(selectedDateStr + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        meetingListHeader.textContent = `Summaries for ${headerDate.toLocaleDateString(undefined, options)}`;

        const dailyMeetings = state.meetings.filter(m => m.date === selectedDateStr);

        if (dailyMeetings.length === 0) {
            const li = document.createElement('li');
            li.className = 'no-tasks-message';
            li.textContent = 'No meeting summaries for this day.';
            meetingList.appendChild(li);
            return;
        }

        dailyMeetings.forEach(meeting => {
            const li = document.createElement('li');
            li.className = 'meeting-item';
            li.dataset.meetingId = meeting.id;

            const header = document.createElement('div');
            header.className = 'meeting-item-header';
            header.innerHTML = `
                <span>${meeting.title}</span>
                <span class="arrow">&#x276F;</span>
            `;

            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'meeting-summary';
            summaryDiv.textContent = meeting.summary;

            header.onclick = () => {
                li.classList.toggle('open');
            };

            li.appendChild(header);
            li.appendChild(summaryDiv);
            meetingList.appendChild(li);
        });
    };

    // --- TASK ACTIONS ---
    const addTask = () => {
        const description = newTaskInput.value.trim();
        if (!description || !teammateSelect.value) {
            alert('Please enter a task and select a teammate.');
            return;
        }
        state.tasks.push({
            id: Date.now(),
            teammate: teammateSelect.value,
            description,
            date: document.querySelector('.date-picker').value,
            status: 'In Progress'
        });
        saveState();
        renderTasks();
        newTaskInput.value = '';
    };

    const deleteTask = (taskId) => {
        if (confirm('Are you sure you want to delete this task?')) {
            state.tasks = state.tasks.filter(t => t.id !== taskId);
            saveState();
            renderTasks();
        }
    };

    const updateTaskStatus = (taskId, newStatus) => {
        const task = state.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            saveState();
            renderTasks(); // Re-render to update styles and carry-over logic
        }
    };

    const startEditingTask = (li, span, taskId) => {
        const currentText = state.tasks.find(t => t.id === taskId).description;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'description-edit';
        
        li.replaceChild(input, span);
        input.focus();

        const saveEdit = () => {
            const newDescription = input.value.trim();
            if (newDescription) {
                const task = state.tasks.find(t => t.id === taskId);
                task.description = newDescription;
                saveState();
            }
            renderTasks(); // Re-render to restore span and show updated value
        };

        input.onblur = saveEdit;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') input.blur();
        };
    };

    // --- TEAMMATE ACTIONS ---
    const addTeammate = () => {
        const name = newTeammateInput.value.trim();
        if (name && !state.teammates.includes(name)) {
            state.teammates.push(name);
            saveState();
            renderTeammates();
            newTeammateInput.value = '';
        } else {
            alert('Teammate name cannot be empty or already exist.');
        }
    };

    const deleteTeammate = (name) => {
        if (confirm(`Are you sure you want to remove ${name}? This will not delete their tasks.`)) {
            state.teammates = state.teammates.filter(t => t !== name);
            saveState();
            renderTeammates();
        }
    };

    // --- MEETING ACTIONS ---
    const saveMeeting = () => {
        const title = meetingTitleInput.value.trim();
        const summary = meetingSummaryInput.value.trim();

        if (!title || !summary) {
            alert('Please provide both a title and a summary for the meeting.');
            return;
        }

        const newMeeting = {
            id: Date.now(),
            date: document.querySelector('.date-picker').value,
            title,
            summary,
        };

        state.meetings.push(newMeeting);
        saveState();
        renderMeetings();
        hideMeetingModal();
    };

    // --- UI & EVENT HANDLERS ---
    const changeDate = (offset) => {
        const datePickers = document.querySelectorAll('.date-picker');
        if (!datePickers.length) return;

        const currentDate = new Date(datePickers[0].value + 'T00:00:00');
        currentDate.setDate(currentDate.getDate() + offset);
        const newDate = currentDate.toISOString().split('T')[0];
        
        datePickers.forEach(picker => picker.value = newDate);
        renderAll();
    };

    const switchView = (viewName) => {
        state.activeView = viewName;
        if (viewName === 'tasks') {
            tasksView.classList.add('active');
            meetingsView.classList.remove('active');
            tabTasks.classList.add('active');
            tabMeetings.classList.remove('active');
        } else {
            tasksView.classList.remove('active');
            meetingsView.classList.add('active');
            tabTasks.classList.remove('active');
            tabMeetings.classList.add('active');
        }
        renderAll();
    };

    const showTeammateModal = () => { teammateModal.classList.add('active'); };
    const hideTeammateModal = () => { teammateModal.classList.remove('active'); };
    const showMeetingModal = () => { meetingModal.classList.add('active'); meetingTitleInput.value = ''; meetingSummaryInput.value = ''; };
    const hideMeetingModal = () => { meetingModal.classList.remove('active'); };

    // --- INITIALIZATION ---
    const initialize = () => {
        loadState();

        const datePickers = document.querySelectorAll('.date-picker');
        datePickers.forEach(picker => picker.value = getTodayString());

        renderAll();

        // Attach event listeners
        teammateSelect.addEventListener('change', renderAll);

        datePickers.forEach(picker => {
            picker.addEventListener('change', (e) => {
                const newDate = e.target.value;
                datePickers.forEach(p => p.value = newDate);
                renderAll();
            });
        });

        const prevDayBtns = document.querySelectorAll('.prev-day-btn');
        prevDayBtns.forEach(btn => btn.addEventListener('click', () => changeDate(-1)));
        
        const nextDayBtns = document.querySelectorAll('.next-day-btn');
        nextDayBtns.forEach(btn => btn.addEventListener('click', () => changeDate(1)));

        addTaskBtn.addEventListener('click', addTask);
        newTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTask();
            }
        });

        // Tab listeners
        tabTasks.addEventListener('click', () => switchView('tasks'));
        tabMeetings.addEventListener('click', () => switchView('meetings'));

        // Teammate Modal listeners
        manageTeammatesBtn.addEventListener('click', showTeammateModal);
        closeModalBtn.addEventListener('click', hideTeammateModal);
        window.addEventListener('click', (e) => { if (e.target.classList.contains('modal-overlay')) { hideTeammateModal(); hideMeetingModal(); } });
        addTeammateBtn.addEventListener('click', addTeammate);
        newTeammateInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTeammate(); });

        // Meeting Modal listeners
        addMeetingBtn.addEventListener('click', showMeetingModal);
        closeMeetingModalBtn.addEventListener('click', hideMeetingModal);
        saveMeetingBtn.addEventListener('click', saveMeeting);
    };

    // Run the app
    initialize();
});
