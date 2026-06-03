const { Pool } = require('pg');
const { Module } = require('../models/module');
const { Assessment } = require('../models/assessment');
const { User } = require('../models/user');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
        || 'postgresql://myuser:mypassword@localhost:5432/myproject',
    options: '-c search_path=SE,public'
});

class PgDatabase {
    async _query(sql, params = []) {
        const client = await pool.connect();
        try {
            return await client.query(sql, params);
        } 
        catch (e) {
            console.error(e)
        }
        finally {
            client.release();
        }
    }

    async _getStudentAssessmentId(user_id, global_assessment_id) {
        const { rows } = await this._query(
            `SELECT id FROM student_assessments WHERE student_id = $1 AND assessment_id = $2`,
            [user_id, global_assessment_id]
        );
        return rows[0]?.id ?? null;
    }

    _parseAssessmentRow(r) {
        return Assessment.Parse({
            id: r.id,
            type: r.assessment_type,
            start_date: r.start_date,
            end_date: r.base_deadline,
            name: r.assessment_name,
            brief_url: r.brief_url,
            description: r.description,
            weight: r.weight / 100,
            module_code: r.module_code
        });
    }

    /////////////////////
    // Study Tasks
    /////////////////////
    async createStudyTask(user_id, assessment_id, name, type, requirement_value, dependencies, notes) {
        const sa_id = await this._getStudentAssessmentId(user_id, assessment_id);
        const { rows } = await this._query(
            `INSERT INTO study_tasks (student_id, assessment_id, task_name, task_type, target_quantity, notes)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [user_id, sa_id, name, type, requirement_value, notes || '']
        );
        const task_id = rows[0].id;

        for (const dep_id of (dependencies || [])) {
            await this._query(
                `INSERT INTO task_dependencies (predecessor_id, successor_id) VALUES ($1, $2)`,
                [dep_id, task_id]
            );
        }

        return task_id;
    }

    async getStudyTasks(assessment_id, user_id) {
        const { rows } = await this._query(
            `SELECT st.id, st.student_id, st.assessment_id, st.task_name, st.task_type,
                    st.target_quantity, st.notes,
                    COALESCE(SUM(a.quantity_completed), 0) AS current_progress,
                    ARRAY_AGG(DISTINCT td.predecessor_id) FILTER (WHERE td.predecessor_id IS NOT NULL) AS dependencies
             FROM study_tasks st
             JOIN student_assessments sa ON sa.id = st.assessment_id
             LEFT JOIN activity_task_link atl ON atl.task_id = st.id
             LEFT JOIN activities a ON a.id = atl.activity_id
             LEFT JOIN task_dependencies td ON td.successor_id = st.id
             WHERE sa.assessment_id = $1 AND st.student_id = $2
             GROUP BY st.id`,
            [assessment_id, user_id]
        );

        return rows.map(r => ({
            id: r.id,
            user_id: r.student_id,
            assessment_id,
            name: r.task_name,
            type: r.task_type,
            requirement: { value: parseFloat(r.target_quantity) },
            current_progress: parseFloat(r.current_progress),
            dependencies: r.dependencies || [],
            notes: r.notes || ''
        }));
    }

    async updateStudyTask(task_id, fields) {
        const col_map = { name: 'task_name', type: 'task_type', notes: 'notes' };
        const sets = [];
        const values = [];
        let idx = 1;

        for (const [key, col] of Object.entries(col_map)) {
            if (fields[key] !== undefined) {
                sets.push(`${col} = $${idx++}`);
                values.push(fields[key]);
            }
        }

        if (fields.requirement !== undefined) {
            sets.push(`target_quantity = $${idx++}`);
            values.push(fields.requirement.value);
        }

        if (sets.length > 0) {
            await this._query(
                `UPDATE study_tasks SET ${sets.join(', ')} WHERE id = $${idx}`,
                [...values, task_id]
            );
        }

        if (fields.dependencies !== undefined) {
            await this._query(`DELETE FROM task_dependencies WHERE successor_id = $1`, [task_id]);
            for (const dep_id of fields.dependencies) {
                await this._query(
                    `INSERT INTO task_dependencies (predecessor_id, successor_id) VALUES ($1, $2)`,
                    [dep_id, task_id]
                );
            }
        }
    }

    async deleteStudyTask(task_id) {
        await this._query(`DELETE FROM study_tasks WHERE id = $1`, [task_id]);
    }

    async isTaskComplete(task_id) {
        const { rows } = await this._query(
            `SELECT get_task_progress($1) AS progress`, [task_id]
        );
        if (parseFloat(rows[0].progress) < 100) return false;

        const { rows: deps } = await this._query(
            `SELECT predecessor_id FROM task_dependencies WHERE successor_id = $1`, [task_id]
        );
        for (const dep of deps) {
            if (!await this.isTaskComplete(dep.predecessor_id)) return false;
        }
        return true;
    }

    /////////////////////
    // Milestones
    /////////////////////
    async createMilestone(user_id, assessment_id, name, due_date, related_task_ids, notes) {
        const sa_id = assessment_id
            ? await this._getStudentAssessmentId(user_id, assessment_id)
            : null;

        const { rows } = await this._query(
            `INSERT INTO milestones (student_id, student_assessment_id, milestone_name, due_date, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [user_id, sa_id, name, due_date || null, notes || '']
        );
        const milestone_id = rows[0].id;

        for (const task_id of (related_task_ids || [])) {
            await this._query(
                `INSERT INTO milestone_task_requirements (milestone_id, task_id, required_quantity)
                 VALUES ($1, $2, 0)`,
                [milestone_id, task_id]
            );
        }

        return milestone_id;
    }

    async getMilestones(assessment_id, user_id) {
        const { rows } = await this._query(
            `SELECT m.id, m.student_id, m.student_assessment_id, m.milestone_name,
                    m.description, m.due_date, m.is_completed, m.notes,
                    COALESCE(mp.percent_complete, 0) AS percent_complete,
                    ARRAY_AGG(mtr.task_id) FILTER (WHERE mtr.task_id IS NOT NULL) AS related_task_ids
             FROM milestones m
             JOIN student_assessments sa ON sa.id = m.student_assessment_id
             LEFT JOIN milestone_progress mp ON mp.milestone_id = m.id
             LEFT JOIN milestone_task_requirements mtr ON mtr.milestone_id = m.id
             WHERE sa.assessment_id = $1 AND m.student_id = $2
             GROUP BY m.id, mp.percent_complete`,
            [assessment_id, user_id]
        );

        return rows.map(r => ({
            id: r.id,
            user_id: r.student_id,
            assessment_id,
            name: r.milestone_name,
            description: r.description || '',
            due_date: r.due_date,
            completed: r.is_completed,
            percent_complete: parseFloat(r.percent_complete),
            notes: r.notes || '',
            related_task_ids: r.related_task_ids || []
        }));
    }

    async updateMilestone(milestone_id, fields) {
        const col_map = {
            name: 'milestone_name',
            due_date: 'due_date',
            description: 'description',
            notes: 'notes'
        };
        const sets = [];
        const values = [];
        let idx = 1;

        for (const [key, col] of Object.entries(col_map)) {
            if (fields[key] !== undefined) {
                sets.push(`${col} = $${idx++}`);
                values.push(fields[key]);
            }
        }

        if (fields.completed !== undefined) {
            sets.push(`is_completed = $${idx++}`);
            values.push(fields.completed);
            if (fields.completed) {
                sets.push(`completed_at = COALESCE(completed_at, $${idx++})`);
                values.push(new Date());
            }
        }

        if (sets.length > 0) {
            await this._query(
                `UPDATE milestones SET ${sets.join(', ')} WHERE id = $${idx}`,
                [...values, milestone_id]
            );
        }

        if (fields.related_task_ids !== undefined) {
            await this._query(
                `DELETE FROM milestone_task_requirements WHERE milestone_id = $1`, [milestone_id]
            );
            for (const task_id of fields.related_task_ids) {
                await this._query(
                    `INSERT INTO milestone_task_requirements (milestone_id, task_id, required_quantity)
                     VALUES ($1, $2, 0)`,
                    [milestone_id, task_id]
                );
            }
        }
    }

    async deleteMilestone(milestone_id) {
        await this._query(`DELETE FROM milestones WHERE id = $1`, [milestone_id]);
    }

    /////////////////////
    // Activities
    /////////////////////
    async createActivity(user_id, assessment_id, amount, time_spent, activity_date, notes, task_ids) {
        const { rows } = await this._query(
            `INSERT INTO activities (student_id, activity_date, quantity_completed, time_spent_minutes, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
                user_id,
                activity_date || new Date().toISOString().slice(0, 10),
                parseFloat(amount),
                Math.round(parseFloat(time_spent) || 0),
                notes || ''
            ]
        );
        const activity_id = rows[0].id;

        for (const task_id of (task_ids || [])) {
            await this._query(
                `INSERT INTO activity_task_link (activity_id, task_id) VALUES ($1, $2)`,
                [activity_id, task_id]
            );
        }

        return activity_id;
    }

    async getAllActivities(user_id) {
        const { rows } = await this._query(
            `SELECT a.id, a.student_id, a.activity_date, a.quantity_completed,
                    a.time_spent_minutes, a.notes,
                    ARRAY_AGG(atl.task_id) FILTER (WHERE atl.task_id IS NOT NULL) AS task_ids
             FROM activities a
             LEFT JOIN activity_task_link atl ON atl.activity_id = a.id
             WHERE a.student_id = $1
             GROUP BY a.id`,
            [user_id]
        );
        return rows.map(r => ({
            id: r.id,
            user_id: r.student_id,
            amount: parseFloat(r.quantity_completed),
            time_spent: r.time_spent_minutes,
            activity_date: r.activity_date,
            notes: r.notes || '',
            task_ids: r.task_ids || []
        }));
    }

    async getActivities(assessment_id, user_id, task_id = null) {
        const base = `
            SELECT a.id, a.student_id, a.activity_date, a.quantity_completed,
                   a.time_spent_minutes, a.notes,
                   ARRAY_AGG(DISTINCT atl.task_id) FILTER (WHERE atl.task_id IS NOT NULL) AS task_ids
            FROM activities a
            JOIN activity_task_link atl ON atl.activity_id = a.id
            WHERE a.student_id = $1
              AND atl.task_id IN (
                  SELECT st.id FROM study_tasks st
                  JOIN student_assessments sa ON sa.id = st.assessment_id
                  WHERE sa.assessment_id = $2 AND st.student_id = $1
              )`;

        let sql, params;
        if (task_id !== null) {
            sql = base + ` AND atl.task_id = $3 GROUP BY a.id`;
            params = [user_id, assessment_id, task_id];
        } else {
            sql = base + ` GROUP BY a.id`;
            params = [user_id, assessment_id];
        }

        const { rows } = await this._query(sql, params);
        return rows.map(r => ({
            id: r.id,
            user_id: r.student_id,
            assessment_id,
            amount: parseFloat(r.quantity_completed),
            time_spent: r.time_spent_minutes,
            activity_date: r.activity_date,
            notes: r.notes || '',
            task_ids: r.task_ids || []
        }));
    }

    async updateActivity(activity_id, fields) {
        const col_map = {
            amount: 'quantity_completed',
            time_spent: 'time_spent_minutes',
            activity_date: 'activity_date',
            notes: 'notes'
        };
        const sets = [];
        const values = [];
        let idx = 1;

        for (const [key, col] of Object.entries(col_map)) {
            if (fields[key] !== undefined) {
                sets.push(`${col} = $${idx++}`);
                values.push(fields[key]);
            }
        }

        if (sets.length > 0) {
            await this._query(
                `UPDATE activities SET ${sets.join(', ')} WHERE id = $${idx}`,
                [...values, activity_id]
            );
        }

        if (fields.task_ids !== undefined) {
            await this._query(`DELETE FROM activity_task_link WHERE activity_id = $1`, [activity_id]);
            for (const tid of fields.task_ids) {
                await this._query(
                    `INSERT INTO activity_task_link (activity_id, task_id) VALUES ($1, $2)`,
                    [activity_id, tid]
                );
            }
        }
    }

    async deleteActivity(activity_id) {
        await this._query(`DELETE FROM activities WHERE id = $1`, [activity_id]);
    }

    /////////////////////
    // Progress
    /////////////////////
    async getAssessmentProgress(user_id, assessment_id) {
        const { rows } = await this._query(
            `SELECT COALESCE(AVG(get_task_progress(st.id)), 0) AS avg_progress
             FROM study_tasks st
             JOIN student_assessments sa ON sa.id = st.assessment_id
             WHERE sa.assessment_id = $1 AND st.student_id = $2`,
            [assessment_id, user_id]
        );
        return parseFloat(rows[0].avg_progress) / 100;
    }

    async isAssessmentCompleted(user_id, assessment_id) {
        return (await this.getAssessmentProgress(user_id, assessment_id)) >= 0.999;
    }

    async getCompletedAssessments(user_id, module_code = null) {
        const assessments = module_code
            ? await this.getModuleAssessments(module_code)
            : await this.getUserAssessments(user_id);
        const results = [];
        for (const a of assessments) {
            if (await this.isAssessmentCompleted(user_id, a.getId())) results.push(a);
        }
        return results;
    }

    async getUpcomingAssessments(user_id, module_code = null) {
        const now = new Date();
        const assessments = module_code
            ? await this.getModuleAssessments(module_code)
            : await this.getUserAssessments(user_id);
        const results = [];
        for (const a of assessments) {
            if (!await this.isAssessmentCompleted(user_id, a.getId()) && new Date(a.getEndDate()) >= now) {
                results.push(a);
            }
        }
        return results;
    }

    async getMissedAssessments(user_id, module_code = null) {
        const now = new Date();
        const assessments = module_code
            ? await this.getModuleAssessments(module_code)
            : await this.getUserAssessments(user_id);
        const results = [];
        for (const a of assessments) {
            if (!await this.isAssessmentCompleted(user_id, a.getId()) && new Date(a.getEndDate()) < now) {
                results.push(a);
            }
        }
        return results;
    }

    /////////////////////
    // Modules & Assessments
    /////////////////////
    async getModules() {
        const { rows } = await this._query(`SELECT * FROM global_modules`);
        return rows.map(r => Module.Parse({
            module_code: r.module_code,
            module_name: r.module_name,
            start_date: r.start_date,
            end_date: r.end_date,
            blackboard_id: r.blackboard_id
        }));
    }

    async getModule(module_code) {
        const { rows } = await this._query(
            `SELECT * FROM global_modules WHERE module_code = $1`, [module_code]
        );
        if (!rows[0]) return null;
        return Module.Parse({
            module_code: rows[0].module_code,
            module_name: rows[0].module_name,
            start_date: rows[0].start_date,
            end_date: rows[0].end_date,
            blackboard_id: rows[0].blackboard_id
        });
    }

    async getModuleAssessments(module_code) {
        const { rows } = await this._query(
            `SELECT * FROM global_assessments WHERE module_code = $1`, [module_code]
        );
        return rows.map(r => this._parseAssessmentRow(r));
    }

    async getUserAssessments(user_id) {
        const { rows } = await this._query(
            `SELECT ga.*
             FROM global_assessments ga
             JOIN student_assessments sa ON sa.assessment_id = ga.id
             WHERE sa.student_id = $1`,
            [user_id]
        );
        return rows.map(r => this._parseAssessmentRow(r));
    }

    async getAssessment(assessment_id) {
        const { rows } = await this._query(
            `SELECT * FROM global_assessments WHERE id = $1`, [assessment_id]
        );
        if (!rows[0]) return null;
        return this._parseAssessmentRow(rows[0]);
    }

    async getAssessmentDeliverables(assessment_id) { return []; }

    async getUserModules(user_id) {
        const { rows } = await this._query(
            `SELECT DISTINCT ga.module_code
             FROM student_assessments sa
             JOIN global_assessments ga ON sa.assessment_id = ga.id
             WHERE sa.student_id = $1`,
            [user_id]
        );
        return rows.map(r => r.module_code);
    }

    /////////////////////
    // Users
    /////////////////////
    async getUsers() {
        const { rows } = await this._query(`SELECT * FROM users`);
        return rows.map(r => User.Parse({
            id: r.id,
            name: r.name,
            email: r.email,
            password: r.password_hash
        }));
    }

    async getUser(user_id) {
        const { rows } = await this._query(`SELECT * FROM users WHERE id = $1`, [user_id]);
        if (!rows[0]) return null;
        return User.Parse({
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
            password: rows[0].password_hash
        });
    }

    async getUserByEmail(email) {
        const { rows } = await this._query(`SELECT * FROM users WHERE email = $1`, [email]);
        if (!rows[0]) return null;
        return User.Parse({
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
            password: rows[0].password_hash
        });
    }

    async addUser(name, email, pass_hash) {
        const { rows } = await this._query(
            `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
            [name, email, pass_hash]
        );
        return rows[0].id;
    }

    async deleteUser(user_id) {
        await this._query(`DELETE FROM users WHERE id = $1`, [user_id]);
    }

    async patchUser(user_id, patch) {
        const col_map = { name: 'name', email: 'email', password: 'password_hash' };
        const col = col_map[patch.field];
        if (!col) return;
        await this._query(`UPDATE users SET ${col} = $1 WHERE id = $2`, [patch.value, user_id]);
    }

    async patchUserPrefs(user_id, prefs) {}

    async resetUserPassword(email, newHash) {
        const { rowCount } = await this._query(
            `UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)`,
            [newHash, email]
        );
        return rowCount > 0;
    }

    /////////////////////
    // Semester
    /////////////////////
    async createSemester(student_id, semester_name, raw_json) {
        const json_str = typeof raw_json === 'string' ? raw_json : JSON.stringify(raw_json);
        const { rows } = await this._query(
            `INSERT INTO semester_profiles (student_id, semester_name, raw_hub_data)
             VALUES ($1, $2, $3) RETURNING id`,
            [student_id, semester_name, json_str]
        );
        await this._query(`SELECT sync_student_hub_data($1, $2::jsonb)`, [student_id, json_str]);
        return rows[0].id;
    }
}


let _db;
module.exports = {
    /**
     * @returns {PgDatabase}
     */
    getDatabase() {
        return _db ??= new PgDatabase();
    }
};
