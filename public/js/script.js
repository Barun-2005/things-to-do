document.addEventListener('DOMContentLoaded', () => {
    const todoList = document.getElementById('todoList');

    // Fetch and display tasks
    const fetchTasks = async () => {
        const response = await fetch('/tasks');
        const tasks = await response.json();

        // Clear the list before re-adding
        todoList.innerHTML = '';

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${task.task} 
                <span class="timestamp">${new Date(task.created_at).toLocaleString()}</span>
                <button class="delete-btn" data-id="${task.id}">Delete</button>
            `;
            todoList.appendChild(li);
        });

        // Add delete functionality to each task
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const taskId = e.target.dataset.id;
                await fetch(`/delete-task/${taskId}`, { method: 'DELETE' });
                fetchTasks(); // Refresh the task list after deletion
            });
        });
    };

    // Fetch tasks when the page loads
    fetchTasks();
});
