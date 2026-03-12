import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI, clientsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const Tasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    assigned_to: '',
    client_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksData, usersData, clientsData] = await Promise.all([
        tasksAPI.getAll({}),
        usersAPI.getAll(),
        clientsAPI.getAll({ limit: 500 }),
      ]);
      setTasks(tasksData.tasks || []);
      setUsers(usersData || []);
      setClients(clientsData.clients || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    try {
      await tasksAPI.create(newTask);
      toast.success('Task created successfully');
      setShowAddDialog(false);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        assigned_to: '',
        client_id: '',
      });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  const handleToggleTask = async (task) => {
    try {
      await tasksAPI.update(task.task_id, { completed: !task.completed });
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksAPI.delete(taskId);
      toast.success('Task deleted');
      loadData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete task');
    }
  };

  const getFilteredTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (activeTab) {
      case 'today':
        return tasks.filter((t) => t.due_date === today && !t.completed);
      case 'overdue':
        return tasks.filter((t) => t.due_date < today && !t.completed);
      case 'upcoming':
        return tasks.filter((t) => t.due_date > today && !t.completed);
      case 'completed':
        return tasks.filter((t) => t.completed);
      default:
        return tasks;
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return styles[priority] || 'bg-slate-100 text-slate-800';
  };

  const today = new Date().toISOString().split('T')[0];
  const todayCount = tasks.filter((t) => t.due_date === today && !t.completed).length;
  const overdueCount = tasks.filter((t) => t.due_date < today && !t.completed).length;
  const upcomingCount = tasks.filter((t) => t.due_date > today && !t.completed).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn" data-testid="tasks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            Tasks
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your daily tasks and reminders</p>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700"
          onClick={() => setShowAddDialog(true)}
          data-testid="add-task-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{todayCount}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{upcomingCount}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{tasks.filter(t => t.completed).length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="today" data-testid="tab-today">
                Today {todayCount > 0 && <Badge variant="secondary" className="ml-1">{todayCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="overdue" data-testid="tab-overdue">
                Overdue {overdueCount > 0 && <Badge variant="destructive" className="ml-1">{overdueCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-6">
          {getFilteredTasks().length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No tasks</h3>
              <p className="text-slate-500">
                {activeTab === 'overdue' ? 'Great! No overdue tasks.' : 'Create a task to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredTasks().map((task) => (
                <div
                  key={task.task_id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                    task.completed 
                      ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700' 
                      : task.due_date < today 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                  data-testid={`task-${task.task_id}`}
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(task)}
                      data-testid={`task-checkbox-${task.task_id}`}
                    />
                    <div className={task.completed ? 'line-through text-slate-400' : ''}>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {task.due_date}
                        </span>
                        {task.client_name && (
                          <span 
                            className="flex items-center gap-1 cursor-pointer hover:text-red-600"
                            onClick={() => navigate(`/clients/${task.client_id}`)}
                          >
                            <User className="h-3 w-3" />
                            {task.client_name}
                          </span>
                        )}
                        {task.assigned_to_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assigned_to_name}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getPriorityBadge(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTask(task.task_id)}
                      className="text-slate-400 hover:text-red-600"
                      data-testid={`delete-task-${task.task_id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>Create a new task or reminder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
                data-testid="task-title-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Task description..."
                data-testid="task-description-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  data-testid="task-due-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger data-testid="task-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={newTask.assigned_to}
                onValueChange={(value) => setNewTask({ ...newTask, assigned_to: value })}
              >
                <SelectTrigger data-testid="task-assignee-select">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Related Client</Label>
              <Select
                value={newTask.client_id}
                onValueChange={(value) => setNewTask({ ...newTask, client_id: value })}
              >
                <SelectTrigger data-testid="task-client-select">
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.client_id} value={client.client_id}>
                      {client.first_name} {client.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleAddTask}
              disabled={!newTask.title || !newTask.due_date}
              data-testid="save-task-btn"
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
