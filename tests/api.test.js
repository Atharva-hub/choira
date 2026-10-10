import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/app.js');
const { connectMongo, disconnectMongo } = await import('../src/config/mongo.js');
const { default: pool, connectMySQL } = await import('../src/config/mysql.js');
const { default: Task } = await import('../src/models/task.model.js');

const run = Date.now();
const alice = { name: 'Alice Test', email: `alice.${run}@example.com`, password: 'Password123' };
const bob = { name: 'Bob Test', email: `bob.${run}@example.com`, password: 'Password123' };
const FAKE_TASK_ID = '64b7f0f0f0f0f0f0f0f0f0f0';

let server;
let baseUrl;
const state = {};

const api = async (method, path, { token, body, rawBody } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || rawBody !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  await Promise.all([connectMySQL(), connectMongo()]);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  const [users] = await pool.query('SELECT id FROM users WHERE email LIKE ?', [`%.${run}@example.com`]);
  const ids = users.map((u) => u.id);
  if (ids.length > 0) {
    await Task.deleteMany({ ownerId: { $in: ids } });
    await pool.query('DELETE FROM users WHERE id IN (?)', [ids]);
  }
  await new Promise((resolve) => server.close(resolve));
  await Promise.allSettled([pool.end(), disconnectMongo()]);
});

describe('Authentication', () => {
  test('register creates a user and returns a token', async () => {
    const res = await api('POST', '/api/auth/register', { body: alice });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, alice.email);
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.equal(res.body.data.user.password_hash, undefined);
    assert.ok(res.body.data.token);
    state.aliceToken = res.body.data.token;

    const second = await api('POST', '/api/auth/register', { body: bob });
    assert.equal(second.status, 201);
    state.bobToken = second.body.data.token;
  });

  test('register rejects a duplicate email with 409', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { ...alice, email: alice.email.toUpperCase() },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('register validates input and lists every invalid field', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { name: 'A', email: 'not-an-email', password: 'short' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Validation failed');
    const fields = res.body.errors.map((e) => e.field);
    assert.ok(fields.includes('name') && fields.includes('email') && fields.includes('password'));
  });

  test('malformed JSON is a 400, not a 500', async () => {
    const res = await api('POST', '/api/auth/register', { rawBody: '{"name": ' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test('login succeeds with correct credentials', async () => {
    const res = await api('POST', '/api/auth/login', {
      body: { email: alice.email, password: alice.password },
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.passwordHash, undefined);
  });

  test('login fails with 401 for a wrong password or unknown email', async () => {
    const wrong = await api('POST', '/api/auth/login', {
      body: { email: alice.email, password: 'WrongPassword1' },
    });
    const unknown = await api('POST', '/api/auth/login', {
      body: { email: `nobody.${run}@example.com`, password: 'Password123' },
    });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, unknown.body.message);
  });

  test('GET /me returns the logged-in user', async () => {
    const res = await api('GET', '/api/auth/me', { token: state.aliceToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, alice.email);
  });

  test('protected routes reject missing or invalid tokens with 401', async () => {
    const paths = ['/api/auth/me', '/api/projects', '/api/tasks', '/api/dashboard'];
    for (const path of paths) {
      const missing = await api('GET', path);
      const invalid = await api('GET', path, { token: 'not.a.real.token' });
      assert.equal(missing.status, 401, `${path} without token`);
      assert.equal(invalid.status, 401, `${path} with bad token`);
    }
  });

  test('profile update changes the name', async () => {
    const res = await api('PUT', '/api/auth/profile', {
      token: state.aliceToken,
      body: { name: 'Alice Updated' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.name, 'Alice Updated');
  });

  test('profile update rejects an empty body and an email that is taken', async () => {
    const empty = await api('PUT', '/api/auth/profile', { token: state.aliceToken, body: {} });
    assert.equal(empty.status, 400);

    const taken = await api('PUT', '/api/auth/profile', {
      token: state.aliceToken,
      body: { email: bob.email },
    });
    assert.equal(taken.status, 409);
  });

  test('changing the password requires the correct current password', async () => {
    const noCurrent = await api('PUT', '/api/auth/profile', {
      token: state.aliceToken,
      body: { password: 'NewPassword456' },
    });
    assert.equal(noCurrent.status, 400);

    const wrongCurrent = await api('PUT', '/api/auth/profile', {
      token: state.aliceToken,
      body: { password: 'NewPassword456', currentPassword: 'WrongPassword1' },
    });
    assert.equal(wrongCurrent.status, 401);

    const ok = await api('PUT', '/api/auth/profile', {
      token: state.aliceToken,
      body: { password: 'NewPassword456', currentPassword: alice.password },
    });
    assert.equal(ok.status, 200);

    const oldLogin = await api('POST', '/api/auth/login', {
      body: { email: alice.email, password: alice.password },
    });
    const newLogin = await api('POST', '/api/auth/login', {
      body: { email: alice.email, password: 'NewPassword456' },
    });
    assert.equal(oldLogin.status, 401);
    assert.equal(newLogin.status, 200);
  });
});

describe('Projects', () => {
  test('create a project (status defaults to active)', async () => {
    const res = await api('POST', '/api/projects', {
      token: state.aliceToken,
      body: { name: 'Website Redesign', description: 'New marketing site' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.project.status, 'active');
    state.projectId = res.body.data.project.id;

    const second = await api('POST', '/api/projects', {
      token: state.aliceToken,
      body: { name: 'Mobile App', status: 'completed' },
    });
    assert.equal(second.status, 201);
    state.secondProjectId = second.body.data.project.id;

    const bobs = await api('POST', '/api/projects', { token: state.bobToken, body: { name: 'Bob Project' } });
    state.bobProjectId = bobs.body.data.project.id;
  });

  test('create validates name and status', async () => {
    const noName = await api('POST', '/api/projects', { token: state.aliceToken, body: {} });
    const badStatus = await api('POST', '/api/projects', {
      token: state.aliceToken,
      body: { name: 'X', status: 'paused' },
    });
    assert.equal(noName.status, 400);
    assert.equal(badStatus.status, 400);
  });

  test('list returns only my projects, and can filter by status', async () => {
    const all = await api('GET', '/api/projects', { token: state.aliceToken });
    assert.equal(all.status, 200);
    assert.equal(all.body.data.projects.length, 2);

    const completed = await api('GET', '/api/projects?status=completed', { token: state.aliceToken });
    assert.equal(completed.body.data.projects.length, 1);
    assert.equal(completed.body.data.projects[0].id, state.secondProjectId);
  });

  test('get one project by id', async () => {
    const res = await api('GET', `/api/projects/${state.projectId}`, { token: state.aliceToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.project.name, 'Website Redesign');
  });

  test('invalid id is 400, missing project is 404', async () => {
    const invalid = await api('GET', '/api/projects/abc', { token: state.aliceToken });
    const missing = await api('GET', '/api/projects/99999999', { token: state.aliceToken });
    assert.equal(invalid.status, 400);
    assert.equal(missing.status, 404);
  });

  test("another user's project cannot be read, updated or deleted", async () => {
    const path = `/api/projects/${state.bobProjectId}`;
    const read = await api('GET', path, { token: state.aliceToken });
    const update = await api('PUT', path, { token: state.aliceToken, body: { name: 'Hacked' } });
    const remove = await api('DELETE', path, { token: state.aliceToken });
    assert.equal(read.status, 404);
    assert.equal(update.status, 404);
    assert.equal(remove.status, 404);

    const stillThere = await api('GET', path, { token: state.bobToken });
    assert.equal(stillThere.body.data.project.name, 'Bob Project');
  });

  test('update a project', async () => {
    const res = await api('PUT', `/api/projects/${state.projectId}`, {
      token: state.aliceToken,
      body: { name: 'Website Redesign v2', status: 'archived' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.project.name, 'Website Redesign v2');
    assert.equal(res.body.data.project.status, 'archived');

    const back = await api('PUT', `/api/projects/${state.projectId}`, {
      token: state.aliceToken,
      body: { status: 'active' },
    });
    assert.equal(back.body.data.project.status, 'active');

    const empty = await api('PUT', `/api/projects/${state.projectId}`, { token: state.aliceToken, body: {} });
    assert.equal(empty.status, 400);
  });
});

describe('Tasks', () => {
  test('create a task in my project (defaults: todo / medium)', async () => {
    const res = await api('POST', '/api/tasks', {
      token: state.aliceToken,
      body: { title: 'Design homepage', projectId: state.projectId },
    });
    assert.equal(res.status, 201);
    const { task } = res.body.data;
    assert.equal(task.status, 'todo');
    assert.equal(task.priority, 'medium');
    assert.equal(task.projectId, state.projectId);
    assert.ok(task.id);
    assert.equal(task._id, undefined);
    state.taskId = task.id;
  });

  test('create validates the body', async () => {
    const res = await api('POST', '/api/tasks', {
      token: state.aliceToken,
      body: { title: '', status: 'done', priority: 'urgent', projectId: 'abc' },
    });
    assert.equal(res.status, 400);
    const fields = res.body.errors.map((e) => e.field);
    for (const field of ['title', 'status', 'priority', 'projectId']) {
      assert.ok(fields.includes(field), `expected an error for ${field}`);
    }
  });

  test("cannot create a task in a missing project or someone else's project", async () => {
    const missing = await api('POST', '/api/tasks', {
      token: state.aliceToken,
      body: { title: 'Ghost', projectId: 99999999 },
    });
    const notMine = await api('POST', '/api/tasks', {
      token: state.aliceToken,
      body: { title: 'Sneaky', projectId: state.bobProjectId },
    });
    assert.equal(missing.status, 404);
    assert.equal(notMine.status, 404);
  });

  test('get one task; invalid id is 400; unknown id is 404', async () => {
    const ok = await api('GET', `/api/tasks/${state.taskId}`, { token: state.aliceToken });
    const invalid = await api('GET', '/api/tasks/123', { token: state.aliceToken });
    const missing = await api('GET', `/api/tasks/${FAKE_TASK_ID}`, { token: state.aliceToken });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.task.title, 'Design homepage');
    assert.equal(invalid.status, 400);
    assert.equal(missing.status, 404);
  });

  test("another user's task cannot be read, updated or deleted", async () => {
    const path = `/api/tasks/${state.taskId}`;
    const read = await api('GET', path, { token: state.bobToken });
    const update = await api('PUT', path, { token: state.bobToken, body: { title: 'Hacked' } });
    const remove = await api('DELETE', path, { token: state.bobToken });
    assert.equal(read.status, 404);
    assert.equal(update.status, 404);
    assert.equal(remove.status, 404);
  });

  test('update a task, including moving it to another of my projects', async () => {
    const res = await api('PUT', `/api/tasks/${state.taskId}`, {
      token: state.aliceToken,
      body: { status: 'in_progress', priority: 'high', dueDate: '2030-01-15' },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.task.status, 'in_progress');
    assert.equal(res.body.data.task.priority, 'high');
    assert.ok(res.body.data.task.dueDate.startsWith('2030-01-15'));

    const moveToBob = await api('PUT', `/api/tasks/${state.taskId}`, {
      token: state.aliceToken,
      body: { projectId: state.bobProjectId },
    });
    assert.equal(moveToBob.status, 404);

    const badStatus = await api('PUT', `/api/tasks/${state.taskId}`, {
      token: state.aliceToken,
      body: { status: 'done' },
    });
    assert.equal(badStatus.status, 400);

    const unknown = await api('PUT', `/api/tasks/${FAKE_TASK_ID}`, {
      token: state.aliceToken,
      body: { title: 'Nope' },
    });
    assert.equal(unknown.status, 404);
  });

  test('completedAt is set when a task is completed and cleared when it is reopened', async () => {
    const path = `/api/tasks/${state.taskId}`;

    const before = await api('GET', path, { token: state.aliceToken });
    assert.equal(before.body.data.task.completedAt, null);

    const completed = await api('PUT', path, { token: state.aliceToken, body: { status: 'completed' } });
    assert.equal(completed.status, 200);
    assert.ok(completed.body.data.task.completedAt);

    const ignored = await api('PUT', path, {
      token: state.aliceToken,
      body: { title: 'Design homepage', completedAt: '2000-01-01' },
    });
    assert.equal(ignored.body.data.task.completedAt, completed.body.data.task.completedAt);

    const reopened = await api('PUT', path, { token: state.aliceToken, body: { status: 'in_progress' } });
    assert.equal(reopened.body.data.task.status, 'in_progress');
    assert.equal(reopened.body.data.task.completedAt, null);
  });

  test('pagination returns the right slices and totals', async () => {
    for (let i = 1; i <= 12; i += 1) {
      const res = await api('POST', '/api/tasks', {
        token: state.aliceToken,
        body: {
          title: `Task ${i}`,
          projectId: i % 2 === 0 ? state.projectId : state.secondProjectId,
          status: i <= 4 ? 'completed' : 'todo',
          priority: i % 3 === 0 ? 'high' : 'low',
        },
      });
      assert.equal(res.status, 201);
    }

    const first = await api('GET', '/api/tasks?page=1&limit=5', { token: state.aliceToken });
    assert.equal(first.status, 200);
    assert.equal(first.body.data.tasks.length, 5);
    assert.deepEqual(first.body.pagination, {
      page: 1,
      limit: 5,
      totalRecords: 13,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    });

    const last = await api('GET', '/api/tasks?page=3&limit=5', { token: state.aliceToken });
    assert.equal(last.body.data.tasks.length, 3);
    assert.equal(last.body.pagination.hasNextPage, false);
    assert.equal(last.body.pagination.hasPrevPage, true);

    const second = await api('GET', '/api/tasks?page=2&limit=5', { token: state.aliceToken });
    const ids = [...first.body.data.tasks, ...second.body.data.tasks, ...last.body.data.tasks].map((t) => t.id);
    assert.equal(new Set(ids).size, 13);

    const defaults = await api('GET', '/api/tasks', { token: state.aliceToken });
    assert.equal(defaults.body.pagination.page, 1);
    assert.equal(defaults.body.pagination.limit, 10);
    assert.equal(defaults.body.data.tasks.length, 10);

    const beyond = await api('GET', '/api/tasks?page=99&limit=5', { token: state.aliceToken });
    assert.equal(beyond.status, 200);
    assert.equal(beyond.body.data.tasks.length, 0);
  });

  test('filtering by status, priority and projectId (alone and combined)', async () => {
    const byStatus = await api('GET', '/api/tasks?status=completed&limit=100', { token: state.aliceToken });
    assert.equal(byStatus.body.pagination.totalRecords, 4);
    assert.ok(byStatus.body.data.tasks.every((t) => t.status === 'completed'));

    const byPriority = await api('GET', '/api/tasks?priority=high&limit=100', { token: state.aliceToken });
    assert.equal(byPriority.body.pagination.totalRecords, 5);
    assert.ok(byPriority.body.data.tasks.every((t) => t.priority === 'high'));

    const byProject = await api('GET', `/api/tasks?projectId=${state.secondProjectId}&limit=100`, {
      token: state.aliceToken,
    });
    assert.equal(byProject.body.pagination.totalRecords, 6);
    assert.ok(byProject.body.data.tasks.every((t) => t.projectId === state.secondProjectId));

    const combined = await api('GET', '/api/tasks?page=1&limit=10&status=todo&priority=high', {
      token: state.aliceToken,
    });
    assert.equal(combined.body.pagination.totalRecords, 3);
    assert.ok(combined.body.data.tasks.every((t) => t.status === 'todo' && t.priority === 'high'));

    const bobSees = await api('GET', '/api/tasks', { token: state.bobToken });
    assert.equal(bobSees.body.pagination.totalRecords, 0);
  });

  test('sorting by title in ascending and descending order', async () => {
    const asc = await api('GET', '/api/tasks?limit=100&sortBy=title&order=asc', { token: state.aliceToken });
    assert.equal(asc.status, 200);
    const titles = asc.body.data.tasks.map((t) => t.title);
    assert.equal(titles.length, 13);
    assert.deepEqual(titles, [...titles].sort());

    const desc = await api('GET', '/api/tasks?limit=100&sortBy=title&order=desc', { token: state.aliceToken });
    assert.deepEqual(desc.body.data.tasks.map((t) => t.title), [...titles].reverse());

    const byDefault = await api('GET', '/api/tasks?limit=100', { token: state.aliceToken });
    const created = byDefault.body.data.tasks.map((t) => t.createdAt);
    assert.deepEqual(created, [...created].sort().reverse());
  });

  test('invalid query parameters are rejected with 400', async () => {
    const queries = [
      'page=0',
      'limit=1000',
      'page=abc',
      'status=done',
      'priority=urgent',
      'projectId=abc',
      'sortBy=priority',
      'order=up',
    ];
    for (const query of queries) {
      const res = await api('GET', `/api/tasks?${query}`, { token: state.aliceToken });
      assert.equal(res.status, 400, query);
    }
  });
});

describe('Dashboard', () => {
  test('returns statistics from both databases for the logged-in user', async () => {
    const res = await api('GET', '/api/dashboard', { token: state.aliceToken });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.stats, {
      totalProjects: 2,
      activeProjects: 1,
      completedProjects: 1,
      totalTasks: 13,
      pendingTasks: 9,
      completedTasks: 4,
      highPriorityTasks: 5,
    });

    const bobStats = await api('GET', '/api/dashboard', { token: state.bobToken });
    assert.deepEqual(bobStats.body.data.stats, {
      totalProjects: 1,
      activeProjects: 1,
      completedProjects: 0,
      totalTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      highPriorityTasks: 0,
    });
  });
});

describe('Deleting', () => {
  test('delete a task', async () => {
    const res = await api('DELETE', `/api/tasks/${state.taskId}`, { token: state.aliceToken });
    assert.equal(res.status, 200);

    const again = await api('DELETE', `/api/tasks/${state.taskId}`, { token: state.aliceToken });
    const read = await api('GET', `/api/tasks/${state.taskId}`, { token: state.aliceToken });
    assert.equal(again.status, 404);
    assert.equal(read.status, 404);
  });

  test('deleting a project also removes its tasks', async () => {
    const res = await api('DELETE', `/api/projects/${state.secondProjectId}`, { token: state.aliceToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.deletedTasks, 6);

    const read = await api('GET', `/api/projects/${state.secondProjectId}`, { token: state.aliceToken });
    assert.equal(read.status, 404);

    const tasks = await api('GET', '/api/tasks?limit=100', { token: state.aliceToken });
    assert.equal(tasks.body.pagination.totalRecords, 6);
    assert.ok(tasks.body.data.tasks.every((t) => t.projectId === state.projectId));
  });
});

describe('General', () => {
  test('health check reports both databases as up', async () => {
    const res = await api('GET', '/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.databases, { mysql: 'up', mongodb: 'up' });
    assert.equal(typeof res.body.data.uptimeSeconds, 'number');
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await api('GET', '/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
